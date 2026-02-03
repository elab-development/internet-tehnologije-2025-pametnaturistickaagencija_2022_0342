const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");
const { travelPlanner } = require("../ai/travelPlanner");

const { getChatContext } = require("../ai/chatMemory");
const { summarizeChat } = require("../ai/summarizeChat");


const router = express.Router();

router.use(auth);

function ensureOwnChat(chat, userId) {
  return chat && chat.userId === userId;
}

function parseChatId(req, res) {
  const chatId = Number(req.params.id);
  if (!Number.isInteger(chatId)) {
    res.status(400).json({ message: "Invalid chat id" });
    return null;
  }
  return chatId;
}

router.get("/", async (req, res, next) => {
  try {
    const userId = Number(req.user.userId);

    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(chats);
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = Number(req.user.userId);
    const { chatName, destination } = req.body;

    if (!chatName || !chatName.toString().trim()) {
      return res.status(400).json({ message: "chatName is required" });
    }

    const chat = await prisma.chat.create({
      data: {
        userId,
        chatName: chatName.toString().trim(),
        destination: destination ? destination.toString().trim() : null,
        summary: null,
        preferences: null,
      },
    });

    res.status(201).json(chat);
  } catch (e) {
    next(e);
  }
});

router.get("/:id/messages", async (req, res, next) => {
  try {
    const userId = Number(req.user.userId);
    const chatId = parseChatId(req, res);
    if (!chatId) return;

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!ensureOwnChat(chat, userId)) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (e) {
    next(e);
  }
});

router.post("/:id/messages", async (req, res, next) => {
  try {
    const userId = Number(req.user.userId);
    const chatId = parseChatId(req, res);
    if (!chatId) return;

    const content = (req.body?.content || "").toString().trim();

    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }
    if (content.length > 4000) {
      return res.status(400).json({ message: "content too long" });
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!ensureOwnChat(chat, userId)) {
      return res.status(404).json({ message: "Chat not found" });
    }

    await prisma.message.create({
      data: {
        chatId,
        role: "user",
        content,
      },
    });

    const totalCount = await prisma.message.count({ where: { chatId } });

    const chatFresh = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { summary: true, summaryUpdatedAt: true },
    });

    if (totalCount >= 20) {
      const tooOld =
        !chatFresh?.summaryUpdatedAt ||
        Date.now() - new Date(chatFresh.summaryUpdatedAt).getTime() > 1000 * 60 * 10;

      if (!chatFresh.summary || tooOld) {
        await summarizeChat(chatId);
      }
    }
    const { summary, messages } = await getChatContext(chatId, 10);

    const plan = await travelPlanner({
      userMessage: content,
      params: {
        destination: chat.destination,
        language: "sr",
      },
      memory: {summary, messages},
    });

    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: JSON.stringify(plan),
      },
    });

    res.status(201).json({
      message: assistantMessage,
      plan,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;