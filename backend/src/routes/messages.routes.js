const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Lista poruka za određeni chat
 *     description: Vraća sve poruke za dati chat (samo ako chat pripada ulogovanom korisniku).
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: chatId
 *         required: true
 *         description: ID chat sesije
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Lista poruka
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: chatId nije prosleđen
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: chatId is required
 *       401:
 *         description: Neautorizovan pristup
 *       404:
 *         description: Chat ne postoji
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Chat not found
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = Number(req.user.userId);
    const chatId = Number(req.query.chatId);

    if (!chatId) return res.status(400).json({ message: "chatId is required" });

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { date: "asc" },
    });

    res.json(messages);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Kreiranje nove poruke
 *     description: Kreira novu poruku u okviru chat sesije (samo za vlasnika chata).
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chatId, senderType, text]
 *             properties:
 *               chatId:
 *                 type: integer
 *                 example: 1
 *               senderType:
 *                 type: string
 *                 example: USER
 *               text:
 *                 type: string
 *                 example: Zdravo, želim plan putovanja za Rim.
 *               flag:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Poruka uspešno kreirana
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Nedostaju obavezna polja
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: chatId, senderType, text are required
 *       401:
 *         description: Neautorizovan pristup
 *       404:
 *         description: Chat ne postoji
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Chat not found
 */
router.post("/", async (req, res, next) => {
  try {
    const userId = Number(req.user.userId);
    const { chatId, senderType, text, flag } = req.body;

    if (!chatId || !senderType || !text) {
      return res.status(400).json({ message: "chatId, senderType, text are required" });
    }

    const chat = await prisma.chat.findFirst({ where: { id: Number(chatId), userId } });
    if (!chat) return res.status(404).json({ message: "Chat not found" });

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