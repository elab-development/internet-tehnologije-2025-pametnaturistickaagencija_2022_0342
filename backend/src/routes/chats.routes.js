const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ message: "userId is required" });

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
    const { userId, chatName } = req.body;
    if (!userId || !chatName) {
      return res.status(400).json({ message: "userId and chatName are required" });
    }

    const chat = await prisma.chat.create({
      data: { userId: Number(userId), chatName },
    });

    res.status(201).json(chat);
  } catch (e) {
    next(e);
  }
});

module.exports = router;