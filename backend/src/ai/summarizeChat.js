const prisma = require("../prisma");
const { getGeminiModel } = require("./gemini");

async function summarizeChat(chatId) {
  const model = getGeminiModel();

  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  const transcript = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = `
Ti si sistem za sažimanje razgovora turističkog planera.
Napravi kratak summary (max 1200 karaktera) koji pamti:
- destinaciju i datume (ako postoje)
- budžet (ako postoji)
- interesovanja
- stil putovanja
- šta je već predloženo
Vrati samo čist tekst (bez JSON-a, bez markdown-a).

RAZGOVOR:
${transcript}
`;

  const resp = await model.generateContent(prompt);
  const summary = resp.response.text().trim().slice(0, 1200);

  await prisma.chat.update({
    where: { id: chatId },
    data: { summary, summaryUpdatedAt: new Date() },
  });

  return summary;
}

module.exports = { summarizeChat };
