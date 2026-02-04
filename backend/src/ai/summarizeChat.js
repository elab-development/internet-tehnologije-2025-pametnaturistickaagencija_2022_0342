const prisma = require("../prisma");
const { getGeminiModel } = require("./gemini");

function tryExtractSummary(text) {
  const t = (text || "").trim();

  if (t.startsWith("{") && t.endsWith("}")) {
    try {
      const obj = JSON.parse(t);
      if (obj && typeof obj.summary === "string") return obj.summary.trim();
    } catch {}
  }

  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const slice = t.slice(start, end + 1);
    try {
      const obj = JSON.parse(slice);
      if (obj && typeof obj.summary === "string") return obj.summary.trim();
    } catch {}
  }

  return t;
}

async function summarizeChat(chatId) {
  const model = getGeminiModel();

  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  const transcript = messages
  .map(m => {
    if (m.role === "assistant" && m.content.trim().startsWith("{")) {
      return "ASSISTANT: [PLAN I PREPORUKE SU DEFINISANE]";
    }
    return `${m.role.toUpperCase()}: ${m.content}`;
  })
  .join("\n");


  const prompt = `
Ti si sistem za sažimanje razgovora turističkog planera.
Napravi kratak summary (max 1200 karaktera) koji pamti:
- destinaciju i datume (ako postoje)
- budžet (ako postoji)
- interesovanja
- stil putovanja
- šta je već predloženo

VRATI ISKLJUČIVO čist tekst.
NEMA JSON-a.
NEMA navodnika oko celog teksta.
NEMA markdown-a.

RAZGOVOR:
${transcript}
`;

  const resp = await model.generateContent(prompt);

  let summary = tryExtractSummary(resp.response.text());
  summary = summary.replace(/^"+|"+$/g, "").trim().slice(0, 1200);

  await prisma.chat.update({
    where: { id: chatId },
    data: { summary, summaryUpdatedAt: new Date() },
  });

  return summary;
}

module.exports = { summarizeChat };
