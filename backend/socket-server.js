require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");

const { getOrCreateChat, addMessage, mergeCriteria, getState } = require("./chatStore.db");

const TravelChatSchema = z.object({
  reply: z.string().optional(),
  criteria_update: z.any().optional(),
  follow_up_questions: z.array(z.string()).optional(),
});

const SOCKET_ORIGIN = process.env.SOCKET_ORIGIN || "*";
const REQUIRE_SOCKET_AUTH = String(process.env.REQUIRE_SOCKET_AUTH || "false") === "true";
const JWT_SECRET = process.env.JWT_SECRET || "";

const RATE_LIMIT_MS = Number(process.env.CHAT_RATE_LIMIT_MS || 1200);
const MAX_MESSAGE_CHARS = Number(process.env.CHAT_MAX_MESSAGE_CHARS || 1500);
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000);

const app = express();
app.use(cors({ origin: SOCKET_ORIGIN }));

app.get("/health-socket", (_, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: SOCKET_ORIGIN } });

function extractToken(socket) {
  const t = socket.handshake?.auth?.token;
  if (t) return t;
  const h = socket.handshake?.headers?.authorization || socket.handshake?.headers?.Authorization;
  if (typeof h === "string" && h.startsWith("Bearer ")) return h.slice("Bearer ".length);
  return null;
}

io.use((socket, next) => {
  try {
    const token = extractToken(socket);
    if (!token) {
      if (REQUIRE_SOCKET_AUTH) return next(new Error("Unauthorized"));
      socket.user = null;
      return next();
    }
    if (!JWT_SECRET) {
      if (REQUIRE_SOCKET_AUTH) return next(new Error("Server auth not configured"));
      socket.user = null;
      return next();
    }
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload;
    return next();
  } catch {
    if (REQUIRE_SOCKET_AUTH) return next(new Error("Unauthorized"));
    socket.user = null;
    return next();
  }
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function safeInt(x) {
  const n = Number(x);
  return Number.isInteger(n) ? n : null;
}

function safeText(x) {
  return String(x ?? "").trim();
}

function shouldRateLimit(socket) {
  const t = Date.now();
  const last = socket.data.lastMsgAt || 0;
  if (t - last < RATE_LIMIT_MS) return true;
  socket.data.lastMsgAt = t;
  return false;
}

async function ensureChatAndOwnership(chatId, userId) {
  await getOrCreateChat(chatId, userId);
}

function parseCriteriaUpdate(update) {
  if (!update) return {};

  if (typeof update === "string") {
    const s = update.trim();
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const obj = JSON.parse(s.slice(start, end + 1));
        if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
      } catch {}
    }
    if (s.includes("\n")) {
      return parseCriteriaUpdate(
        s
          .split("\n")
          .map((x) => x.replace(/^criteria_update\s*:\s*/i, "").trim())
          .filter(Boolean)
      );
    }
    return {};
  }

  if (Array.isArray(update)) {
    const obj = {};
    for (const item of update) {
      if (typeof item !== "string") continue;
      const s = item.trim();
      if (!s) continue;

      let key, valueRaw;
      if (s.includes("=")) {
        [key, ...valueRaw] = s.split("=");
      } else if (s.includes(":")) {
        [key, ...valueRaw] = s.split(":");
      } else continue;

      key = key.trim();
      valueRaw = valueRaw.join(":").trim();

      let v = valueRaw.toLowerCase();

      if (v.match(/\d+/) && v.includes("dan")) v = Number(v.match(/\d+/)[0]);
      else if (v.match(/\d+/) && (v.includes("eur") || v.includes("€") || v.includes("evra")))
        v = Number(v.match(/\d+/)[0]);
      else if (!isNaN(Number(v))) v = Number(v);

      if (key === "duration") key = "days";
      if (key === "budget") key = "budget_eur";
      if (key === "interests" && typeof v === "string") {
        v = v.split(/,|and|i|&/gi).map((x) => x.trim()).filter(Boolean);
      }

      obj[key] = v;
    }
    return obj;
  }

  if (typeof update === "object") return update;
  return {};
}

function normalizeGeminiParsed(parsed, raw) {
  const followUp = Array.isArray(raw?.follow_up_questions) ? raw.follow_up_questions : [];
  let criteriaUpdate = parseCriteriaUpdate(raw?.criteria_update);

  if (!criteriaUpdate || Object.keys(criteriaUpdate).length === 0) {
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const copy = { ...parsed };
      delete copy.reply;
      delete copy.criteria_update;
      delete copy.follow_up_questions;
      criteriaUpdate = parseCriteriaUpdate(copy);
    } else {
      criteriaUpdate = {};
    }
  }

  const reply =
    typeof raw?.reply === "string" && raw.reply.trim()
      ? raw.reply.trim()
      : "Vazi, azurirao sam kriterijume.";

  return { reply, criteria_update: criteriaUpdate, follow_up_questions: followUp };
}

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("chat_join", async (payload) => {
    try {
      const chatId = safeInt(payload?.chatId);
      const userId = safeInt(socket.user?.userId || payload?.userId);
      if (!chatId || !userId) throw new Error("chatId and userId required");
      await ensureChatAndOwnership(chatId, userId);
      socket.join(String(chatId));
      socket.emit("chat_state", await getState(chatId, 50));
    } catch (e) {
      socket.emit("chat_error", { message: "Join failed", details: e.message });
    }
  });

  socket.on("chat_message", async (payload) => {
    const chatId = safeInt(payload?.chatId);
    try {
      if (!chatId) throw new Error("chatId required");
      if (shouldRateLimit(socket)) return;

      const userId = safeInt(socket.user?.userId || payload?.userId);
      const text = safeText(payload?.message);
      if (!userId || !text) throw new Error("userId and message required");

      await ensureChatAndOwnership(chatId, userId);
      if (payload?.criteriaSoFar) await mergeCriteria(chatId, payload.criteriaSoFar);
      await addMessage(chatId, "user", text);

      io.to(String(chatId)).emit("chat_response_start", { chatId });

      const state = await getState(chatId, 1);
      const prompt = `
Ti si pametna turisticka agencija.
Vrati validan JSON.
Kriterijumi:
${JSON.stringify(state.criteria)}
Poruka:
${text}
`;

      const stream = await ai.models.generateContentStream({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", responseJsonSchema: zodToJsonSchema(TravelChatSchema) },
      });

      let full = "";
      for await (const chunk of stream) {
        const delta = chunk?.text || "";
        if (delta) {
          full += delta;
          io.to(String(chatId)).emit("chat_response_chunk", { chatId, delta });
        }
      }

      let parsed;
      try { parsed = JSON.parse(full); } catch { parsed = {}; }
      const raw = TravelChatSchema.parse(parsed);
      const data = normalizeGeminiParsed(parsed, raw);

      const criteria = await mergeCriteria(chatId, data.criteria_update);
      await addMessage(chatId, "assistant", data.reply);

      io.to(String(chatId)).emit("chat_response_done", {
        chatId,
        reply: data.reply,
        criteria,
        criteria_update: data.criteria_update,
        follow_up_questions: data.follow_up_questions,
      });
    } catch (e) {
      io.to(String(chatId || socket.id)).emit("chat_error", { message: e.message });
    }
  });
});

server.listen(Number(process.env.SOCKET_PORT || 4001));



