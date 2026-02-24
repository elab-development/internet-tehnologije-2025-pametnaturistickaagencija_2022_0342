require('dotenv').config()

const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

const { GoogleGenAI } = require('@google/genai')
const { z } = require('zod')
const { zodToJsonSchema } = require('zod-to-json-schema')

const { getOrCreateChat, addMessage, getState } = require('./chatStore.db')

function wantsCheaper(text) {
  const t = String(text || '').toLowerCase()
  return (
    t.includes('jeftin') ||
    t.includes('povoljn') ||
    t.includes('niž') ||
    t.includes('preskupo') ||
    t.includes('manji budžet')
  )
}

function extractNewBudgetFromReply(reply) {
  const s = String(reply || '')

  // 1) prioritet: "novi budžet je 1600"
  let m = s.match(/novi\s+budžet[^0-9]{0,20}(\d{2,6})/i)
  if (m) return Number(m[1])

  // 2) "budžet ... 1600 eur/€"
  m = s.match(/budžet[^0-9]{0,20}(\d{2,6})\s*(eur|evra|€)\b/i)
  if (m) return Number(m[1])

  // 3) bilo koji iznos sa valutom "1600€" / "1600 eur"
  m = s.match(/(\d{2,6})\s*(eur|evra|€)\b/i)
  if (m) return Number(m[1])

  // 4) fallback: uzmi najveći broj u tekstu (ignoriši 20%)
  const nums = (s.match(/\d{2,6}/g) || []).map(Number).filter(Number.isFinite)
  if (nums.length === 0) return null

  // ignoriši 20 baš kad postoji 20%
  const hasPercent20 = /20\s*%/.test(s)
  const filtered = hasPercent20 ? nums.filter(n => n !== 20) : nums

  return filtered.length ? Math.max(...filtered) : Math.max(...nums)
}

function reduceBudget20(baseBudget) {
  const b = Number(baseBudget)
  if (!Number.isFinite(b) || b <= 0) return null
  return Math.max(50, Math.round(b * 0.8))
}

function normalizeBudget(b, baseBudget) {
  const n = Number(b)
  if (!Number.isFinite(n)) return null

  // ako je neko poslao 20 (procenat), a base je 2000, očigledno je pogrešno
  if (n > 0 && baseBudget && n < baseBudget * 0.2) {
    return null
  }

  // minimum budžet u eur (da izbegneš 20, 30, itd)
  if (n < 50) return null

  return n
}

// ✅ IMPORT SerpAPI pretrage (prilagodi putanju!)
const serpapiTravelSearch = require('./src/services/serpapiTravelSearch')

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
      if (key === 'budget') key = 'budget_eur'
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

const TravelChatSchema = z.object({
  reply: z.string(),
  criteria_update: z
    .union([
      z.object({
        destination: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        budget: z.coerce.number().optional(),
        interests: z.array(z.string()).optional(),
        type: z.string().optional(),
        lang: z.enum(['sr', 'en']).optional(),
      }),
      z.string(), // ✅ prihvati i string
    ])
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
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000) // (trenutno ne koristimo direktno)

const app = express()

const raw = process.env.SOCKET_ORIGIN || ''
const ALLOWED = raw
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // Postman/server-to-server
    if (ALLOWED.length === 0) return cb(null, true)
    return ALLOWED.includes(origin) ? cb(null, true) : cb(new Error('CORS blocked'))
  },
  credentials: true,
}

app.use(cors(corsOptions))

const server = http.createServer(app)
const io = new Server(server, { cors: corsOptions })

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

function toYmd(s) {
  return String(s || '').trim()
}

function summarizeOffersForAi(offers = []) {
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

    // ✅ zadrži postojeće parametre koji su bitni SerpAPI-ju
    passengers: base.passengers,
    fromCity: base.fromCity,
  }
}

function applyFiltersUpdate(offers, filters) {
  if (!filters || typeof filters !== 'object') return offers

  let out = offers

  if (filters.betterReviews) {
    out = [...out].sort((a, b) => {
      const ra = a?.accommodation?.rating ?? a?.rating ?? 0
      const rb = b?.accommodation?.rating ?? b?.rating ?? 0
      return rb - ra
    })
  }

  if (Array.isArray(filters.mustHaveAmenities) && filters.mustHaveAmenities.length > 0) {
    const want = filters.mustHaveAmenities.map(x => String(x).toLowerCase())
    out = out.filter(o => {
      const am = (o?.amenities || o?.accommodation?.amenities || []).map(x =>
        String(x).toLowerCase(),
      )
      return want.every(w => am.includes(w))
    })
  }

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

// ✅ Payload schema usklađen sa SerpAPI potrebama (fromCity, passengers)
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

    // ✅ novo / opciono
    fromCity: z.string().optional(),
  }),

  currentFilters: z.any().optional(),
  currentOffers: z.array(z.any()).optional(),
})

io.on('connection', socket => {
  socket.on('chat_join', async payload => {
    try {
      const chatId = safeInt(payload?.chatId)
      const userId = safeInt(socket.user?.userId || payload?.userId)
      if (!chatId || !userId) throw new Error('chatId and userId required')
      await ensureChatAndOwnership(chatId, userId)
      socket.join(String(chatId))
      socket.emit('chat_state', await getState(chatId, 50))
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

      // ✅ defaults koji su bitni SerpAPI-ju
      const fromCity = baseSearchParams.fromCity || 'Beograd'
      const adults = Number(baseSearchParams.passengers) || 2

      await ensureChatAndOwnership(chatId, userId)
      await addMessage(chatId, 'user', text)

      io.to(String(chatId)).emit('chat_response_start', { chatId })

      const aiPrompt = `
Ti si turistički AI asistent. Tvoj zadatak: fino podešavanje kriterijuma pretrage.

Vrati ISKLJUČIVO jedan JSON objekat po šemi:
{
  "reply": "string",
  "criteria_update": { "destination"?, "from"?, "to"?, "budget"?, "interests"?, "type"?, "lang"? },
  "filters_update": { "priceRange"?, "mustHaveAmenities"?, "betterReviews"?, "options"?, "travelType"? },
  "follow_up_questions": ["string"]?
}

Kontekst:
- Polazak (fromCity): ${fromCity}
- Broj putnika (passengers/adults): ${adults}

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

VAŽNO:
- Ako u "reply" napišeš da menjaš budžet/datume/destinaciju, MORAŠ to upisati i u criteria_update.
- Ne piši "smanjujem budžet" ako criteria_update.budget nije postavljen.
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
      console.log(full)

      let aiJson = {}
      try {
        aiJson = JSON.parse(full)
        function normalizeFiltersUpdate(fu) {
          if (!fu) return {}
          if (typeof fu === 'object' && !Array.isArray(fu)) return fu

          // ako je array, tretiraj kao "options" ili "mustHaveAmenities"
          if (Array.isArray(fu)) {
            const items = fu
              .map(String)
              .map(s => s.trim())
              .filter(Boolean)

            // heuristika: ako izgleda kao amenities, ubaci u mustHaveAmenities
            return {
              mustHaveAmenities: items,
            }
          }

          // ako je string, probaj da ga parsiraš ili splituješ
          if (typeof fu === 'string') {
            const s = fu.trim()
            if (!s) return {}
            try {
              const parsed = JSON.parse(s)
              if (Array.isArray(parsed)) return { mustHaveAmenities: parsed.map(String) }
              if (parsed && typeof parsed === 'object') return parsed
            } catch {}
            return {
              mustHaveAmenities: s
                .split(/,|\n|;|•|-|\u2022/)
                .map(x => x.trim())
                .filter(Boolean),
            }
          }

          return {}
        }

        // ✅ normalize follow_up_questions
        if (aiJson && typeof aiJson === 'object') {
          const fu = aiJson.follow_up_questions

          if (typeof fu === 'string') {
            // pokušaj da ga pretvoriš u listu
            const s = fu.trim()

            // ako je JSON string tipa '["a","b"]'
            if (s.startsWith('[') && s.endsWith(']')) {
              try {
                const parsed = JSON.parse(s)
                aiJson.follow_up_questions = Array.isArray(parsed) ? parsed.map(String) : [s]
              } catch {
                aiJson.follow_up_questions = s
                  .split(/\n|;|•|-|\u2022|,/)
                  .map(x => x.trim())
                  .filter(Boolean)
              }
            } else {
              aiJson.follow_up_questions = s
                .split(/\n|;|•|-|\u2022|,/)
                .map(x => x.trim())
                .filter(Boolean)
            }
          } else if (fu == null) {
            aiJson.follow_up_questions = []
          }
        }
        // ✅ normalizuj criteria_update / filters_update ako dođu kao string
        if (aiJson && typeof aiJson === 'object') {
          if (typeof aiJson.criteria_update === 'string') {
            aiJson.criteria_update = parseCriteriaUpdate(aiJson.criteria_update)
          }
          if (typeof aiJson.filters_update === 'string') {
            aiJson.filters_update = parseCriteriaUpdate(aiJson.filters_update)
          }
        }

        if (Array.isArray(aiJson)) aiJson = aiJson.find(x => x && typeof x === 'object') || {}
        if (aiJson && typeof aiJson === 'object' && aiJson.criteria_update === null)
          aiJson.criteria_update = {}
        if (aiJson && typeof aiJson === 'object' && aiJson.filters_update === null)
          aiJson.filters_update = {}
      } catch {
        io.to(String(chatId)).emit('chat_error', {
          message: 'Molimo formulišite zahtev drugačije.',
        })
        return
      }

      if (aiJson && typeof aiJson === 'object') {
        aiJson.filters_update = normalizeFiltersUpdate(aiJson.filters_update)
      }

      const aiOut = TravelChatSchema.parse(aiJson)
      const criteriaUpdate =
        aiOut.criteria_update &&
        typeof aiOut.criteria_update === 'object' &&
        !Array.isArray(aiOut.criteria_update)
          ? { ...aiOut.criteria_update }
          : {}

      const filtersUpdate =
        aiOut.filters_update &&
        typeof aiOut.filters_update === 'object' &&
        !Array.isArray(aiOut.filters_update)
          ? aiOut.filters_update
          : {}

      // ✅ ENFORCE: ako korisnik traži jeftinije, a AI nije popunio criteria_update.budget → mi ga upisujemo
      if (
        wantsCheaper(text) &&
        (criteriaUpdate.budget == null || !Number.isFinite(Number(criteriaUpdate.budget)))
      ) {
        // probaj prvo da izvučeš iz AI reply (u tvom primeru 1600)
        const fromReply = extractNewBudgetFromReply(aiOut.reply)
        const forced = fromReply ?? reduceBudget20(baseSearchParams.budget)

        if (forced != null) {
          const fromReplyRaw = extractNewBudgetFromReply(aiOut.reply)
          const fromReply = normalizeBudget(fromReplyRaw, baseSearchParams.budget)

          const forced = fromReply ?? reduceBudget20(baseSearchParams.budget)
          criteriaUpdate.budget = forced
        }
      }

      console.log(
        '[ENFORCE] baseBudget=',
        baseSearchParams.budget,
        'criteriaUpdate=',
        criteriaUpdate,
      )

      // ✅ Primeni criteria_update, ali zadrži passengers/fromCity
      const updatedSearchParams = applyCriteriaUpdateToSearchParams(
        baseSearchParams,
        criteriaUpdate,
      )
      console.log('[UPDATED] updatedSearchParams.budget=', updatedSearchParams.budget)

      const lang = (criteriaUpdate.lang || 'sr').toLowerCase()

      // ✅ Pozovi REALNU pretragu (SerpAPI)
      const searchResult = await serpapiTravelSearch({
        destination: updatedSearchParams.destination,
        from: updatedSearchParams.startDate,
        to: updatedSearchParams.endDate,
        budget: updatedSearchParams.budget,

        // ✅ ključno usklađenje sa tvojom pretragom:
        adults: Number(updatedSearchParams.passengers) || adults, // hoteli
        fromCity: updatedSearchParams.fromCity || fromCity, // letovi
        lang,
      })

      const offers = Array.isArray(searchResult?.offers) ? searchResult.offers : []

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

const PORT = Number(process.env.PORT || process.env.SOCKET_PORT || 4001)
server.listen(PORT, '0.0.0.0', () => console.log('Socket listening on', PORT))
