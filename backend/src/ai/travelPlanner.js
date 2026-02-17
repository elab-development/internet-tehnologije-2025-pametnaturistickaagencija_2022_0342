const { getGeminiModel } = require('./gemini')
const serpapiTravelSearch = require('../services/serpapiTravelSearch')
const { validateOrRepair } = require('../ai/validateOrRepair')

function safeParseSummary(summary) {
  if (!summary) return ''
  const s = String(summary)
  if (!s.trim().startsWith('{')) return s

  try {
    const obj = JSON.parse(s)
    return obj?.summary ? String(obj.summary) : s
  } catch {
    return s
  }
}

function normalizeSourcesFromOffers(offers = [], limit = 3) {
  const seen = new Set()
  const out = []

  for (const o of offers || []) {
    const link = o?.source?.link
    if (!link) continue
    if (seen.has(link)) continue
    seen.add(link)

    out.push({
      title: String(o?.accommodation?.name || o?.transport?.type || 'Source').slice(0, 140),
      link: String(link),
    })

    if (out.length >= limit) break
  }
  return out
}

function buildPrompt(userMessage, params, offers, memory) {
  const summary = safeParseSummary(memory?.summary || '')
  const summaryText = summary ? `\nKONTEKST (SUMMARY):\n${summary}\n` : ''

  const lastMessagesText = (memory?.messages || [])
    .map(m => {
      const role = String(m.role || '').toUpperCase()
      let c = String(m.content || '')

      if (role === 'ASSISTANT') {
        if (c.trim().startsWith('{')) c = c.slice(0, 300) + '...'
        if (c.length > 350) c = c.slice(0, 350) + '...'
      } else {
        if (c.length > 350) c = c.slice(0, 350) + '...'
      }
      return `${role}: ${c}`
    })
    .join('\n')

  const memoryBlock =
    summaryText || lastMessagesText
      ? `\n${summaryText}\nPOSLEDNJIH 10 PORUKA:\n${lastMessagesText}\n`
      : ''

  return `
Ti si pametna turistička agencija.
Vrati ISKLJUČIVO validan JSON (bez markdown-a, bez objašnjenja, bez komentara).
Output mora biti 100% parseable sa JSON.parse u Node.js.
Ne sme da sadrži nikakav tekst pre/posle JSON-a.
Ne koristi trailing zareze.
Ako interests bude prazan niz, napravi opšti plan (top znamenitosti + lokalna hrana + šetnje) i dodaj 1 do 2 follow_up_questions da precizira interesovanja.
Ako nemaš pitanja, follow_up_questions mora biti [].

${memoryBlock}

Korisnička poruka:
${userMessage}

Parametri (ako postoje):
${JSON.stringify(params || {}, null, 2)}

NORMALIZOVANE PONUDE (iz sistema) — koristi ih da odabereš najbolje i objasniš zašto:
${JSON.stringify((offers || []).slice(0, 10), null, 2)}

Vrati JSON tačno po šemi:
{
  "criteria": {
    "destination": string,
    "from": string|null,
    "to": string|null,
    "budget_eur": number|null,
    "interests": string[],
    "type": string|null,
    "language": "sr"|"en"
  },
  "offers": [
    {
      "accommodation": {
        "name": string,
        "type": string,
        "stars": number|null,
        "rating": number|null,
        "distance_from_center_km": number|null
      } | null,
      "price": { "total": number|null, "currency": string, "per_person": boolean },
      "transport": { "type": string, "from": string|null, "to": string, "estimated_duration": string|null },
      "availability": boolean|null,
      "ai_explanation": string
    }
  ],
  "follow_up_questions": string[]
}

PRAVILA:
- "offers" vrati max 6 najboljih ponuda (sortiraj po uklapanju u budžet + interesovanja + blizina centra ako postoji).
- Svaka ponuda MORA da ima "ai_explanation" (1-2 rečenice, jasno i korisnički).
- Nemoj ubacivati linkove u output; server dodaje izvore.
`.trim()
}

async function travelPlanner({ userMessage, params = {}, memory = null }) {
  const model = getGeminiModel()

  const searchParams = {
    destination: params.destination || userMessage,
    type: params.type || '',
    interests: Array.isArray(params.interests)
      ? params.interests.join(', ')
      : params.interests || '',
    budget: params.budget || params.budget_eur,
    lang: params.lang || params.language || 'sr',
    from: params.from || '',
    to: params.to || '',
    fromCity: params.fromCity || params.departure || 'Beograd',
  }

  let searchResult = null
  try {
    searchResult = await serpapiTravelSearch(searchParams)
  } catch (e) {
    console.error('SERPAPI FAILED:', e?.message || e)
    searchResult = { destination: searchParams.destination, offers: [] }
  }

  const destination = searchResult?.destination || searchParams.destination || ''
  const offers = Array.isArray(searchResult?.offers) ? searchResult.offers : []

  const sourcesMin = normalizeSourcesFromOffers(offers, 3)

  let text = ''
  try {
    const resp = await model.generateContent(buildPrompt(userMessage, params, offers, memory))
    text = resp.response.text()
  } catch (e) {
    const status = e?.status || e?.response?.status
    console.error('GEMINI FAILED:', status, e?.message || e)

    return {
      criteria: {
        destination,
        from: params.from ?? null,
        to: params.to ?? null,
        budget_eur: params.budget_eur ?? params.budget ?? null,
        interests: Array.isArray(params.interests) ? params.interests : [],
        type: params.type ?? null,
        language: params.language || params.lang || 'sr',
      },
      offers: offers.slice(0, 6).map(o => ({
        ...o,
        ai_explanation:
          (params.lang || params.language) === 'en'
            ? 'AI is temporarily unavailable. This offer is shown based on the best available match.'
            : 'AI je trenutno nedostupan. Ponuda je prikazana na osnovu najboljeg poklapanja.',
      })),
      sources: sourcesMin,
      follow_up_questions:
        (params.lang || params.language) === 'en'
          ? ['What dates and budget should I optimize for?']
          : ['Koji su datumi i budžet da bolje optimizujem ponude?'],
    }
  }

  const result = await validateOrRepair(text, async badOutput => {
    const repairPrompt = `
Ti si validator i popravljač JSON-a.
Vrati ISKLJUČIVO validan JSON (bez markdown-a, bez komentara).
Output mora biti 100% parseable sa JSON.parse u Node.js.
Ne sme da sadrži nikakav tekst pre/posle JSON-a.
Ne koristi single quotes.
Ispravi sledeći output da tačno odgovara šemi.

ŠEMA:
{
  "criteria": {
    "destination": string,
    "from": string|null,
    "to": string|null,
    "budget_eur": number|null,
    "interests": string[],
    "type": string|null,
    "language": "sr"|"en"
  },
  "offers": [
    {
      "accommodation": {
        "name": string,
        "type": string,
        "stars": number|null,
        "rating": number|null,
        "distance_from_center_km": number|null
      } | null,
      "price": { "total": number|null, "currency": string, "per_person": boolean },
      "transport": { "type": string, "from": string|null, "to": string, "estimated_duration": string|null },
      "availability": boolean|null,
      "ai_explanation": string
    }
  ],
  "follow_up_questions": string[]
}

NAPOMENE:
- follow_up_questions mora biti niz (ako nema pitanja -> [])
- offers mora biti niz (max 6), i svaka ponuda mora imati ai_explanation
- Ne vraćaj "sources" uopšte (server ih dodaje)
- destination i language popuni ako možeš iz korisničke poruke/parametara

NEVALIDAN OUTPUT:
${badOutput}
`.trim()

    try {
      const repairResp = await model.generateContent(repairPrompt)
      return repairResp.response.text()
    } catch (e) {
      const status = e?.status || e?.response?.status
      console.error('REPAIR FAILED:', status, e?.message || e)

      return JSON.stringify({
        criteria: {
          destination,
          from: params.from ?? null,
          to: params.to ?? null,
          budget_eur: params.budget_eur ?? params.budget ?? null,
          interests: Array.isArray(params.interests) ? params.interests : [],
          type: params.type ?? null,
          language: params.language || params.lang || 'sr',
        },
        offers: offers.slice(0, 6).map(o => ({
          ...o,
          ai_explanation:
            (params.lang || params.language) === 'en'
              ? 'This offer is selected as a best-effort match based on available data.'
              : 'Ova ponuda je izabrana kao najbolje poklapanje na osnovu dostupnih podataka.',
        })),
        follow_up_questions:
          (params.lang || params.language) === 'en'
            ? ['Should I prioritize lower price or better location?']
            : ['Da li da prioritet bude niža cena ili bolja lokacija?'],
      })
    }
  })

  if (result?.criteria) {
    if (!result.criteria.destination) result.criteria.destination = destination
    if (!result.criteria.language) result.criteria.language = params.language || params.lang || 'sr'
    if (result.criteria.budget_eur == null && (params.budget_eur || params.budget)) {
      result.criteria.budget_eur = params.budget_eur ?? params.budget ?? null
    }
  }

  result.sources = sourcesMin

  return { ...result, repairPrompt }
}

module.exports = { travelPlanner }
