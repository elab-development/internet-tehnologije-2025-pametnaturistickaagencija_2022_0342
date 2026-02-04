const { v4: uuidv4 } = require("uuid");

const chats = new Map();

const TTL_MS = Number(process.env.CHAT_TTL_MINUTES || 180) * 60 * 1000;
const MAX_MESSAGES = Number(process.env.CHAT_MAX_MESSAGES || 50);

function now() {
  return Date.now();
}

function touch(chat) {
  chat.updatedAt = now();
}

function getChat(chatId) {
  if (!chats.has(chatId)) {
    chats.set(chatId, {
      chatId,
      criteria: {},
      messages: [],
      createdAt: now(),
      updatedAt: now(),
    });
  }
  const chat = chats.get(chatId);
  touch(chat);
  return chat;
}

function addMessage(chatId, msg) {
  const chat = getChat(chatId);
  chat.messages.push({
    id: uuidv4(),
    role: msg.role,
    text: msg.text,
    ts: now(),
  });
  while (chat.messages.length > MAX_MESSAGES) chat.messages.shift();
  touch(chat);
  return chat;
}

function mergeCriteria(chatId, update) {
  const chat = getChat(chatId);
  chat.criteria = { ...chat.criteria, ...(update || {}) };
  touch(chat);
  return chat.criteria;
}

function getState(chatId) {
  const chat = getChat(chatId);
  return { chatId, criteria: chat.criteria, messages: chat.messages };
}

function resetChat(chatId) {
  chats.delete(chatId);
}

function cleanup() {
  const cutoff = now() - TTL_MS;
  for (const [chatId, chat] of chats.entries()) {
    if ((chat.updatedAt || chat.createdAt || 0) < cutoff) chats.delete(chatId);
  }
}

setInterval(cleanup, 60 * 1000).unref();

module.exports = { getChat, addMessage, mergeCriteria, getState, resetChat };
