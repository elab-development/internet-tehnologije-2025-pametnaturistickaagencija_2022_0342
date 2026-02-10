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
