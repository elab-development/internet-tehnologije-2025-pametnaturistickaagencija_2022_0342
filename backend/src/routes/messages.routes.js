const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, async (req, res, next) => {
  try {
    const chatId = Number(req.query.chatId);
    if (!chatId) return res.status(400).json({ message: "chatId is required" });

    const userId = Number(req.user.userId);

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
      select: { id: true },
    });

    if (!chat) return res.status(403).json({ message: "Forbidden" });

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { date: "asc" },
    });

    res.json(messages);
  } catch (e) {
    next(e);
  }
});

router.post("/", auth, async (req, res, next) => {
  try {
    const { chatId, senderType, text, flag } = req.body;
    if (!chatId || !senderType || !text) {
      return res.status(400).json({ message: "chatId, senderType, text are required" });
    }

    const userId = Number(req.user.userId);

    const chat = await prisma.chat.findFirst({
      where: { id: Number(chatId), userId },
      select: { id: true },
    });

    if (!chat) return res.status(403).json({ message: "Forbidden" });

    const message = await prisma.message.create({
      data: {
        chatId: Number(chatId),
        senderType,
        text,
        flag: flag ?? false,
      },
    });

    res.status(201).json(message);
  } catch (e) {
    next(e);
  }
});

module.exports = router;