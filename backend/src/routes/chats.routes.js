const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);


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
    const { chatName } = req.body;

    if (!chatName) {
      return res.status(400).json({ message: "chatName is required" });
    }

    const chat = await prisma.chat.create({
      data: { userId, chatName },
    });

    res.status(201).json(chat);
  } catch (e) {
    next(e);
  }
});

module.exports = router;