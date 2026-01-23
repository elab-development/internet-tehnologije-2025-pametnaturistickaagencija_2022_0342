const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.get("/", auth, async (req, res, next) => {
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

router.post("/", auth, async (req, res, next) => {
  try {
    const { chatName } = req.body;
    if (!chatName) return res.status(400).json({ message: "chatName is required" });

    const userId = Number(req.user.userId);

    const chat = await prisma.chat.create({
      data: { userId, chatName },
    });

    res.status(201).json(chat);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", auth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.chat.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;