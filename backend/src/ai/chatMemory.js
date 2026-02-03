const prisma = require("../prisma");

async function getChatContext(chatId, lastN = 10) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { summary: true, summaryUpdatedAt: true },
  });

  const last = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: lastN,
  });

  const messages = last.reverse();

  return { summary: chat?.summary || null, messages };
}

module.exports = { getChatContext };
