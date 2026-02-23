const express = require('express')
const prisma = require('../prisma')
const auth = require('../middleware/auth')
const { travelPlanner } = require('../ai/travelPlanner')
const { getChatContext } = require('../ai/chatMemory')
const { summarizeChat } = require('../ai/summarizeChat')
const { extractPreferences } = require('../ai/extractPreferences')

const router = express.Router()
router.use(auth)

function ensureOwnChat(chat, userId) {
  return chat && chat.userId === userId
}

function parseChatId(req, res) {
  const chatId = Number(req.params.id)
  if (!Number.isInteger(chatId)) {
    res.status(400).json({ message: 'Invalid chat id' })
    return null
  }
  return chatId
}

function diffDays(from, to) {
  const a = new Date(from)
  const b = new Date(to)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  const ms = b.getTime() - a.getTime()
  const days = Math.round(ms / (1000 * 60 * 60 * 24))
  return days > 0 ? days : null
}

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Lista chat sesija korisnika
 *     description: Vraća sve chat sesije ulogovanog korisnika sortirane po datumu kreiranja opadajuće.
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista chat sesija
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Neautorizovan pristup (nema/loš token)
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = Number(req.user.userId)
    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(chats)
  } catch (e) {
    next(e)
  }
})

/**
 * @swagger
 * /api/chats:
 *   post:
 *     summary: Kreiranje nove chat sesije
 *     description: Kreira novu chat sesiju za ulogovanog korisnika (chatName obavezan, destination opciono).
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chatName]
 *             properties:
 *               chatName:
 *                 type: string
 *                 example: "Plan za Rim"
 *               destination:
 *                 type: string
 *                 example: "Rim"
 *     responses:
 *       201:
 *         description: Kreiran chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: chatName je obavezan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: chatName is required
 *       401:
 *         description: Neautorizovan pristup (nema/loš token)
 */
router.post('/', async (req, res, next) => {
  try {
    console.log('POST /api/chats called with body:', req.body)
    console.log('User from auth:', req.user)

    const userId = Number(req.user.userId)
    const { chatName, destination } = req.body

    if (!chatName || !chatName.toString().trim()) {
      return res.status(400).json({ message: 'chatName is required' })
    }

    const chat = await prisma.chat.create({
      data: {
        userId,
        chatName: chatName.toString().trim(),
        destination: destination ? destination.toString().trim() : null,
        summary: null,
        preferences: null,
      },
    })

    res.status(201).json(chat)
  } catch (e) {
    next(e)
  }
})

/**
 * @swagger
 * /api/chats/{id}/messages:
 *   get:
 *     summary: Lista poruka za chat
 *     description: Vraća poruke za dati chat (samo ako chat pripada ulogovanom korisniku).
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID chat sesije
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Lista poruka (sortirano rastuće po createdAt)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Nevalidan chat id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid chat id
 *       401:
 *         description: Neautorizovan pristup (nema/loš token)
 *       404:
 *         description: Chat ne postoji ili ne pripada korisniku
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Chat not found
 */
router.get('/:id/messages', async (req, res, next) => {
  try {
    const userId = Number(req.user.userId)
    const chatId = parseChatId(req, res)
    if (!chatId) return

    const chat = await prisma.chat.findUnique({ where: { id: chatId } })
    if (!ensureOwnChat(chat, userId)) {
      return res.status(404).json({ message: 'Chat not found' })
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    })

    res.json(messages)
  } catch (e) {
    next(e)
  }
})

/**
 * @swagger
 * /api/chats/{id}/messages:
 *   post:
 *     summary: Slanje poruke u chat i dobijanje AI plana
 *     description: Dodaje korisničku poruku, opcionalno ažurira preferencije, generiše plan putovanja preko AI i upisuje assistant poruku u bazu. Vraća assistant poruku i plan.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID chat sesije
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Želim 3 dana u Rimu do 500€, volim muzeje i hranu."
 *     responses:
 *       201:
 *         description: Kreirana AI poruka i vraćen plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: object
 *                   description: Poruka asistenta (role=assistant)
 *                 plan:
 *                   type: object
 *                   description: Plan putovanja (AI rezultat)
 *       400:
 *         description: Nevalidan zahtev (chat id/content)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: content is required
 *       401:
 *         description: Neautorizovan pristup (nema/loš token)
 *       404:
 *         description: Chat ne postoji ili ne pripada korisniku
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Chat not found
 */
router.post('/:id/messages', async (req, res, next) => {
  try {
    const userId = Number(req.user.userId)
    const chatId = parseChatId(req, res)
    if (!chatId) return

    const content = (req.body?.content || '').toString().trim()

    if (!content) return res.status(400).json({ message: 'content is required' })
    if (content.length > 4000) return res.status(400).json({ message: 'content too long' })

    const chat = await prisma.chat.findUnique({ where: { id: chatId } })
    if (!ensureOwnChat(chat, userId)) return res.status(404).json({ message: 'Chat not found' })

    await prisma.message.create({
      data: { chatId, role: 'user', content },
    })

    const extracted = extractPreferences(content)

    if (Object.keys(extracted).length > 0) {
      const current = chat.preferences || {}

      const merged = {
        ...current,
        ...extracted,
        interests: Array.from(
          new Set([...(current.interests || []), ...(extracted.interests || [])]),
        ),
        diet: Array.from(new Set([...(current.diet || []), ...(extracted.diet || [])])),
        avoid: Array.from(new Set([...(current.avoid || []), ...(extracted.avoid || [])])),
      }
      if (merged.avoid?.length && merged.interests?.length) {
        merged.interests = merged.interests.filter(i => !merged.avoid.includes(i))
      }

      if ((!merged.days || merged.days <= 0) && merged.from && merged.to) {
        const d = diffDays(merged.from, merged.to)
        if (d) merged.days = d
      }

      await prisma.chat.update({
        where: { id: chatId },
        data: {
          preferences: merged,
          destination: merged.destination || chat.destination || null,
        },
      })

      chat.preferences = merged
      chat.destination = merged.destination || chat.destination
    }

    const totalCount = await prisma.message.count({ where: { chatId } })

    const chatFresh = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { summary: true, summaryUpdatedAt: true },
    })

    if (totalCount >= 20) {
      const tooOld =
        !chatFresh?.summaryUpdatedAt ||
        Date.now() - new Date(chatFresh.summaryUpdatedAt).getTime() > 1000 * 60 * 10

      if (!chatFresh.summary || tooOld) {
        await summarizeChat(chatId)
      }
    }

    const { summary, messages } = await getChatContext(chatId, 10)

    const plan = await travelPlanner({
      userMessage: content,
      params: {
        destination: chat.destination || '',
        language: 'sr',
        ...(chat.preferences || {}),
      },
      memory: { summary, messages },
    })

    const assistantMessage = await prisma.message.create({
      data: { chatId, role: 'assistant', content: JSON.stringify(plan) },
    })

    res.status(201).json({ message: assistantMessage, plan })
  } catch (e) {
    next(e)
  }
})

module.exports = router
