const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getOrCreateChat(chatId, userId) {
  const id = Number(chatId);
  if (!Number.isInteger(id)) throw new Error("chatId must be an integer");
  if (!Number.isInteger(Number(userId))) throw new Error("userId must be an integer");

  return prisma.chat.upsert({
    where: { id },
    update: {},
    create: {
      id,
      userId: Number(userId),
      criteria: {},
    },
  });
}

async function addMessage(chatId, role, content) {
  const id = Number(chatId);
  if (!Number.isInteger(id)) throw new Error("chatId must be an integer");

  return prisma.message.create({
    data: {
      chatId: id,
      role: String(role),
      content: String(content),
    },
  });
}

async function mergeCriteria(chatId, update) {
  const id = Number(chatId);
  if (!Number.isInteger(id)) throw new Error("chatId must be an integer");

  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) throw new Error("chat not found");

  const next = { ...(chat.criteria || {}), ...(update || {}) };

  await prisma.chat.update({
    where: { id },
    data: { criteria: next },
  });

  return next;
}

async function getState(chatId, limit = 50) {
  const id = Number(chatId);
  if (!Number.isInteger(id)) throw new Error("chatId must be an integer");

  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) throw new Error("chat not found");

  const messages = await prisma.message.findMany({
    where: { chatId: id },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return {
    chatId: id,
    criteria: chat.criteria || {},
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.content,
      ts: m.createdAt.getTime(),
    })),
  };
}

module.exports = { getOrCreateChat, addMessage, mergeCriteria, getState, prisma };