require('dotenv').config()

const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

const { GoogleGenAI } = require('@google/genai')
const { z } = require('zod')
const { zodToJsonSchema } = require('zod-to-json-schema')

const { getOrCreateChat, addMessage, mergeCriteria, getState } = require('./chatStore.db')

const TravelChatSchema = z.object({
  reply: z.string(),
  criteria_update: z
    .object({
      destination: z.string().optional(),
      from: z.string().optional(), // YYYY-MM-DD
      to: z.string().optional(), // YYYY-MM-DD
      budget: z.coerce.number().optional(),
      interests: z.array(z.string()).optional(),
      type: z.string().optional(),
      lang: z.enum(['sr', 'en']).optional(),
    })
    .nullish(),
  filters_update: z
    .object({
      priceRange: z.tuple([z.coerce.number(), z.coerce.number()]).optional(),
      mustHaveAmenities: z.array(z.string()).optional(),
      betterReviews: z.boolean().optional(),
      options: z.array(z.string()).optional(),
      travelType: z.array(z.string()).optional(),
      locationKeywords: z.array(z.string()).optional(),
    })
    .nullish(),
  follow_up_questions: z.array(z.string()).optional(),
})

const SOCKET_ORIGIN = process.env.SOCKET_ORIGIN || '*'
const REQUIRE_SOCKET_AUTH = String(process.env.REQUIRE_SOCKET_AUTH || 'false') === 'true'
const JWT_SECRET = process.env.JWT_SECRET || ''

const RATE_LIMIT_MS = Number(process.env.CHAT_RATE_LIMIT_MS || 1200)
const MAX_MESSAGE_CHARS = Number(process.env.CHAT_MAX_MESSAGE_CHARS || 1500)
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000)

const app = express()
app.use(cors({ origin: SOCKET_ORIGIN }))

app.get('/health-socket', (_, res) => res.json({ ok: true }))

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: SOCKET_ORIGIN } })

function extractToken(socket) {
  const t = socket.handshake?.auth?.token
  if (t) return t
  const h = socket.handshake?.headers?.authorization || socket.handshake?.headers?.Authorization
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice('Bearer '.length)
  return null
}

io.use((socket, next) => {
  try {
    const token = extractToken(socket)
    if (!token) {
      if (REQUIRE_SOCKET_AUTH) return next(new Error('Unauthorized'))
      socket.user = null
      return next()
    }
    if (!JWT_SECRET) {
      if (REQUIRE_SOCKET_AUTH) return next(new Error('Server auth not configured'))
      socket.user = null
      return next()
    }
    const payload = jwt.verify(token, JWT_SECRET)
    socket.user = payload
    return next()
  } catch {
    if (REQUIRE_SOCKET_AUTH) return next(new Error('Unauthorized'))
    socket.user = null
    return next()
  }
})

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

function safeInt(x) {
  const n = Number(x)
  return Number.isInteger(n) ? n : null
}

function safeText(x) {
  return String(x ?? '').trim()
}

function shouldRateLimit(socket) {
  const t = Date.now()
  const last = socket.data.lastMsgAt || 0
  if (t - last < RATE_LIMIT_MS) return true
  socket.data.lastMsgAt = t
  return false
}

async function ensureChatAndOwnership(chatId, userId) {
  await getOrCreateChat(chatId, userId)
}

function parseCriteriaUpdate(update) {
  if (!update) return {}

  if (typeof update === 'string') {
    const s = update.trim()
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const obj = JSON.parse(s.slice(start, end + 1))
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj
      } catch {}
    }
    if (s.includes('\n')) {
      return parseCriteriaUpdate(
        s
          .split('\n')
          .map(x => x.replace(/^criteria_update\s*:\s*/i, '').trim())
          .filter(Boolean),
      )
    }
    return {}
  }

  if (Array.isArray(update)) {
    const obj = {}
    for (const item of update) {
      if (typeof item !== 'string') continue
      const s = item.trim()
      if (!s) continue

      let key, valueRaw
      if (s.includes('=')) {
        ;[key, ...valueRaw] = s.split('=')
      } else if (s.includes(':')) {
        ;[key, ...valueRaw] = s.split(':')
      } else continue

      key = key.trim()
      valueRaw = valueRaw.join(':').trim()

      let v = valueRaw.toLowerCase()

      if (v.match(/\d+/) && v.includes('dan')) v = Number(v.match(/\d+/)[0])
      else if (v.match(/\d+/) && (v.includes('eur') || v.includes('€') || v.includes('evra')))
        v = Number(v.match(/\d+/)[0])
      else if (!isNaN(Number(v))) v = Number(v)

      if (key === 'duration') key = 'days'
      if (key === 'interests' && typeof v === 'string') {
        v = v
          .split(/,|and|i|&/gi)
          .map(x => x.trim())
          .filter(Boolean)
      }

      obj[key] = v
    }
    return obj
  }

  if (typeof update === 'object') return update
  return {}
}

function normalizeGeminiParsed(parsed, raw) {
  const followUp = Array.isArray(raw?.follow_up_questions) ? raw.follow_up_questions : []
  let criteriaUpdate = parseCriteriaUpdate(raw?.criteria_update)

  if (!criteriaUpdate || Object.keys(criteriaUpdate).length === 0) {
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const copy = { ...parsed }
      delete copy.reply
      delete copy.criteria_update
      delete copy.follow_up_questions
      criteriaUpdate = parseCriteriaUpdate(copy)
    } else {
      criteriaUpdate = {}
    }
  }

  const reply =
    typeof raw?.reply === 'string' && raw.reply.trim()
      ? raw.reply.trim()
      : 'Vazi, azurirao sam kriterijume.'

  return { reply, criteria_update: criteriaUpdate, follow_up_questions: followUp }
}

function extractBudgetFromText(text) {
  const s = String(text || '')
  // hvata "200", "200€", "200 eur", "200 evra"
  const m =
    s.match(/(?:budžet|budget)[^\d]{0,20}(\d{2,6})\s*(?:€|eur|evra)?/i) ||
    s.match(/(\d{2,6})\s*(?:€|eur|evra)\b/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function toYmd(s) {
  const t = String(s || '').trim()
  return t
}

function summarizeOffersForAi(offers = []) {
  // Nemoj slati sve — samo bitno, max 8-12 ponuda
  return offers.slice(0, 10).map(o => ({
    name: o?.accommodation?.name ?? o?.name,
    type: o?.accommodation?.type ?? o?.type,
    stars: o?.accommodation?.stars ?? null,
    rating: o?.accommodation?.rating ?? o?.rating ?? null,
    price_total: o?.price?.total ?? o?.price ?? null,
    currency: o?.price?.currency ?? 'EUR',
    amenities: o?.amenities ?? o?.mustHaveAmenities ?? [],
    distance_km: o?.accommodation?.distance_from_center_km ?? o?.distance ?? null,
  }))
}

function applyCriteriaUpdateToSearchParams(base, update) {
  const u = update && typeof update === 'object' ? update : {}
  return {
    ...base,
    destination:
      typeof u.destination === 'string' && u.destination.trim()
        ? u.destination.trim()
        : base.destination,
    startDate: typeof u.from === 'string' && u.from.trim() ? toYmd(u.from) : base.startDate,
    endDate: typeof u.to === 'string' && u.to.trim() ? toYmd(u.to) : base.endDate,
    budget: typeof u.budget === 'number' ? u.budget : base.budget,
    preferences: Array.isArray(u.interests) ? u.interests : base.preferences,
  }
}

function applyFiltersUpdate(offers, filters) {
  if (!filters || typeof filters !== 'object') return offers

  let out = offers

  // betterReviews => sortiraj po rating desc (ako postoji)
  if (filters.betterReviews) {
    out = [...out].sort((a, b) => {
      const ra = a?.accommodation?.rating ?? a?.rating ?? 0
      const rb = b?.accommodation?.rating ?? b?.rating ?? 0
      return rb - ra
    })
  }

  // mustHaveAmenities => filter po amenity (ako u offeru postoji amenities list)
  if (Array.isArray(filters.mustHaveAmenities) && filters.mustHaveAmenities.length > 0) {
    const want = filters.mustHaveAmenities.map(x => String(x).toLowerCase())
    out = out.filter(o => {
      const am = (o?.amenities || o?.accommodation?.amenities || []).map(x =>
        String(x).toLowerCase(),
      )
      return want.every(w => am.includes(w))
    })
  }

  // priceRange => filter po total price ako postoji
  if (Array.isArray(filters.priceRange) && filters.priceRange.length === 2) {
    const [min, max] = filters.priceRange
    out = out.filter(o => {
      const p = o?.price?.total ?? o?.price ?? null
      if (typeof p !== 'number') return true
      return p >= min && p <= max
    })
  }

  return out
}

const ChatMessagePayloadSchema = z.object({
  chatId: z.coerce.number(),
  userId: z.coerce.number().optional(),
  message: z.string().min(1).max(MAX_MESSAGE_CHARS),

  searchParams: z.object({
    destination: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    budget: z.coerce.number(),
    passengers: z.coerce.number(),
    preferences: z.array(z.string()).optional(),
  }),

  currentFilters: z.any().optional(),
  currentOffers: z.array(z.any()).optional(),
})

io.on('connection', socket => {
  console.log('socket connected', socket.id)

  socket.on('chat_join', async payload => {
    try {
      const chatId = safeInt(payload?.chatId)
      const userId = safeInt(socket.user?.userId || payload?.userId)
      if (!chatId || !userId) throw new Error('chatId and userId required')
      await ensureChatAndOwnership(chatId, userId)
      socket.join(String(chatId))
      const st = await getState(chatId, 50)
      socket.emit('chat_state', { ...st, criteria: pickCoreCriteria(st.criteria) })
    } catch (e) {
      socket.emit('chat_error', { message: 'Join failed', details: e.message })
    }
  })

  socket.on('chat_message', async payload => {
    try {
      const parsedPayload = ChatMessagePayloadSchema.parse(payload)
      const chatId = parsedPayload.chatId

      if (shouldRateLimit(socket)) return

      const userId = safeInt(socket.user?.userId || parsedPayload.userId)
      if (!userId) throw new Error('userId required')

      const text = safeText(parsedPayload.message)
      const baseSearchParams = parsedPayload.searchParams
      const currentFilters = parsedPayload.currentFilters || {}
      const currentOffers = parsedPayload.currentOffers || []

      await ensureChatAndOwnership(chatId, userId)
      await addMessage(chatId, 'user', text)

      io.to(String(chatId)).emit('chat_response_start', { chatId })

      // ✅ AI prompt (SK4 korak 4-5)
      const aiPrompt = `
Ti si turistički AI asistent. Tvoj zadatak: fino podešavanje kriterijuma pretrage.

Vrati ISKLJUČIVO jedan JSON objekat po šemi:
{
  "reply": "string",
  "criteria_update": { "destination"?, "from"?, "to"?, "budget"?, "interests"?, "type"?, "lang"? },
  "filters_update": { "priceRange"?, "mustHaveAmenities"?, "betterReviews"?, "options"?, "travelType"? },
  "follow_up_questions": ["string"]?
}

PRAVILA:
- criteria_update služi samo da promeni parametre pretrage (destination/from/to/budget/interests/type/lang).
- filters_update služi za dodatne UI filtere (npr pool, bolje ocene, raspon cene).
- Ako korisnik kaže "jeftinije", smanji budget za 20% (minimalno 50€) i upiši u criteria_update.budget.
- Ako korisnik ne menja core parametre, criteria_update neka bude {}.

POSTOJEĆI searchParams:
${JSON.stringify(baseSearchParams)}

POSTOJEĆI filteri:
${JSON.stringify(currentFilters)}

TRENUTNE ponude (sažetak):
${JSON.stringify(summarizeOffersForAi(currentOffers))}

Korisnik kaže:
${text}
`

      const stream = await ai.models.generateContentStream({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: zodToJsonSchema(TravelChatSchema),
        },
      })

      let full = ''
      for await (const chunk of stream) {
        const delta = chunk?.text || ''
        if (delta) {
          full += delta
          io.to(String(chatId)).emit('chat_response_chunk', { chatId, delta })
        }
      }

      let aiJson = {}
      try {
        aiJson = JSON.parse(full)
        if (Array.isArray(aiJson)) aiJson = aiJson.find(x => x && typeof x === 'object') || {}
        if (aiJson && typeof aiJson === 'object' && aiJson.criteria_update === null)
          aiJson.criteria_update = {}
        if (aiJson && typeof aiJson === 'object' && aiJson.filters_update === null)
          aiJson.filters_update = {}
      } catch {
        // Alt 7.1
        io.to(String(chatId)).emit('chat_error', {
          message: 'Molimo formulišite zahtev drugačije.',
        })
        return
      }

      const aiOut = TravelChatSchema.parse(aiJson)
      const criteriaUpdate = aiOut.criteria_update || {}
      const filtersUpdate = aiOut.filters_update || {}

      // ✅ Primeni criteria_update na SearchParams
      const updatedSearchParams = applyCriteriaUpdateToSearchParams(
        baseSearchParams,
        criteriaUpdate,
      )

      // ✅ Pozovi REALNU pretragu (SK4 korak 5-6)
      const searchResult = await serpapiTravelSearch({
        destination: updatedSearchParams.destination,
        from: updatedSearchParams.startDate,
        to: updatedSearchParams.endDate,
        budget: updatedSearchParams.budget,
        interests: Array.isArray(updatedSearchParams.preferences)
          ? updatedSearchParams.preferences.join(',')
          : '',
        type: criteriaUpdate.type || '',
        lang: (criteriaUpdate.lang || 'sr').toLowerCase(),
      })

      const offers = Array.isArray(searchResult?.offers) ? searchResult.offers : []

      // Alt 7.2
      if (offers.length === 0) {
        await addMessage(chatId, 'assistant', 'Nema ponuda koje odgovaraju vašim kriterijumima.')
        io.to(String(chatId)).emit('chat_response_done', {
          chatId,
          reply: 'Nema ponuda koje odgovaraju vašim kriterijumima.',
          updatedSearchParams,
          updatedFilters: filtersUpdate,
          updatedOffers: [],
          criteria_update: criteriaUpdate,
          filters_update: filtersUpdate,
          follow_up_questions: aiOut.follow_up_questions || [],
        })
        return
      }

      // ✅ Opcionalno: primeni filters_update (sort/filter)
      const finalOffers = applyFiltersUpdate(offers, filtersUpdate)

      await addMessage(chatId, 'assistant', aiOut.reply)

      // ✅ SK4 korak 7: vrati i poruku i ponude
      io.to(String(chatId)).emit('chat_response_done', {
        chatId,
        reply: aiOut.reply,
        updatedSearchParams,
        updatedFilters: filtersUpdate,
        updatedOffers: finalOffers,
        criteria_update: criteriaUpdate,
        filters_update: filtersUpdate,
        follow_up_questions: aiOut.follow_up_questions || [],
      })
    } catch (e) {
      io.to(String(payload?.chatId || socket.id)).emit('chat_error', {
        message: e?.message || 'Molimo formulišite zahtev drugačije.',
      })
    }
  })
})

server.listen(Number(process.env.SOCKET_PORT || 4001))



