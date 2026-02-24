const axios = require('axios')
const airportsRaw = require('../../airports.json')

const SERPAPI_URL = 'https://serpapi.com/search.json'

const DEFAULT_CURRENCY = 'EUR'
const MAX_FLIGHTS = 5
const MAX_HOTELS = 8

const NOMINATIM_USER_AGENT = 'SerpapiTravelSearch/1.0 (contact: you@example.com)'
const NOMINATIM_ACCEPT_LANGUAGE = 'en'

const CITY_TO_IATA_FAST = {
  beograd: 'BEG',
  belgrade: 'BEG',
  bg: 'BEG',
  nis: 'INI',
  niš: 'INI',
  zagreb: 'ZAG',
  sarajevo: 'SJJ',
  podgorica: 'TGD',
  skoplje: 'SKP',
  pristina: 'PRN',
  tirana: 'TIA',

  budva: 'TIV',
  kotor: 'TIV',
  'herceg novi': 'TIV',
  bar: 'TGD',
  ulcinj: 'TGD',
}

function safeNumber(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v)
    .replace(',', '.')
    .replace(/[^\d.]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

function formatDate(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function defaultDates() {
  const now = new Date()
  const checkIn = new Date(now)
  checkIn.setDate(checkIn.getDate() + 14)
  const checkOut = new Date(checkIn)
  checkOut.setDate(checkOut.getDate() + 3)
  return { checkIn: formatDate(checkIn), checkOut: formatDate(checkOut) }
}

function normalizeKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isIata(s) {
  return typeof s === 'string' && /^[A-Z]{3}$/.test(s.trim())
}
function isMid(s) {
  return typeof s === 'string' && s.trim().startsWith('/m/')
}

async function serpapi(params) {
  const r = await axios.get(SERPAPI_URL, {
    params: {
      api_key: process.env.SERPAPI_KEY,
      ...params,
    },
    timeout: 20000,
  })
  return r.data
}

const AIRPORTS = Object.values(airportsRaw)
  .filter(a => typeof a?.iata === 'string' && /^[A-Z]{3}$/.test(a.iata))
  .map(a => ({
    iata: a.iata,
    name: a.name,
    city: a.city,
    country: a.country,
    lat: Number(a.lat),
    lon: Number(a.lon),
  }))
  .filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lon))

const geocodeCache = new Map()
const nearestAirportCache = new Map()
const resolveIdCache = new Map()

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = x => (x * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2

  return 2 * R * Math.asin(Math.sqrt(a))
}

function findNearestAirport(coords) {
  if (!coords) return null
  let best = null
  let bestDist = Infinity

  for (const ap of AIRPORTS) {
    const d = haversineKm(coords.lat, coords.lon, ap.lat, ap.lon)
    if (d < bestDist) {
      bestDist = d
      best = ap
    }
  }

  if (!best) return null
  return { iata: best.iata, distance_km: bestDist, name: best.name }
}

async function geocodePlace(query) {
  const key = normalizeKey(query)
  if (geocodeCache.has(key)) return geocodeCache.get(key)

  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      addressdetails: '0',
    }).toString()

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        'Accept-Language': NOMINATIM_ACCEPT_LANGUAGE,
      },
    })

    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`)
    const json = await res.json()

    const first = json?.[0]
    if (!first) {
      geocodeCache.set(key, null)
      return null
    }

    const lat = Number(first.lat)
    const lon = Number(first.lon)
    const coords = Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null

    geocodeCache.set(key, coords)
    return coords
  } catch (e) {
    geocodeCache.set(key, null)
    return null
  }
}

async function resolveToNearestAirportIata(placeName) {
  const key = normalizeKey(placeName)
  if (nearestAirportCache.has(key)) return nearestAirportCache.get(key)

  const coords = await geocodePlace(placeName)
  if (!coords) {
    nearestAirportCache.set(key, null)
    return null
  }

  const nearest = findNearestAirport(coords)
  nearestAirportCache.set(key, nearest)
  return nearest
}

function extractMidFromLocationsResponse(data) {
  const candidates = []

  if (data?.google_id) candidates.push(data.google_id)
  if (data?.mid) candidates.push(data.mid)

  const arrays = [data?.locations, data?.place_results, data?.local_results, data?.results].filter(
    Array.isArray,
  )

  for (const arr of arrays) {
    for (const item of arr) {
      candidates.push(item?.google_id, item?.mid, item?.id, item?.googleId)
    }
  }

  const mid = candidates.find(v => typeof v === 'string' && v.startsWith('/m/'))
  return mid || null
}

async function resolveFlightId(input, { lang } = {}) {
  if (!input) return null

  const raw = String(input).trim()
  if (isIata(raw)) return raw
  if (isMid(raw)) return raw

  const key = normalizeKey(raw)
  if (resolveIdCache.has(key)) return resolveIdCache.get(key)

  if (CITY_TO_IATA_FAST[key]) {
    resolveIdCache.set(key, CITY_TO_IATA_FAST[key])
    return CITY_TO_IATA_FAST[key]
  }

  const queries = [raw, `${raw}, ${lang === 'sr' ? 'Srbija' : 'Serbia'}`, `${raw} airport`]

  for (const q of queries) {
    try {
      const locData = await serpapi({
        engine: 'google_locations',
        q,
        hl: lang === 'sr' ? 'sr' : 'en',
      })

      const mid = extractMidFromLocationsResponse(locData)
      if (mid) {
        resolveIdCache.set(key, mid)
        return mid
      }
    } catch {}
  }

  const nearest = await resolveToNearestAirportIata(raw)
  const id = nearest?.iata || null
  resolveIdCache.set(key, id)
  return id
}

async function searchHotels({ destination, from, to, lang, budget, adults }) {
  const { checkIn, checkOut } = defaultDates()

  const data = await serpapi({
    engine: 'google_hotels',
    q: `hotels in ${destination}`,
    hl: lang === 'sr' ? 'sr' : 'en',
    check_in_date: from || checkIn,
    check_out_date: to || checkOut,
    adults: adults || 2,
  })

  const hotels = data?.properties || data?.hotel_results || []

  const getByPath = (obj, path) => {
    if (!obj || !path) return undefined
    return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
  }

  const pickFirst = (obj, paths, fallback = undefined) => {
    for (const p of paths) {
      const v = getByPath(obj, p)
      if (v !== undefined && v !== null && v !== '') return v
    }
    return fallback
  }

  function getNights(from, to) {
    if (!from || !to) return 1
    const d1 = new Date(from)
    const d2 = new Date(to)
    return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)))
  }

  const getNumber = value => {
    if (value === undefined || value === null) return null
    if (typeof value === 'number' && Number.isFinite(value)) return value

    const s = String(value)
      .replace(/\u00A0/g, ' ')
      .replace(',', '.')
    const m = s.match(/-?\d+(\.\d+)?/)
    if (!m) return null
    const n = Number(m[0])
    return Number.isFinite(n) ? n : null
  }

  const getCurrency = h => {
    const fromExplicit = pickFirst(h, [
      'currency',
      'rate_per_night.currency',
      'total_rate.currency',
    ])
    if (fromExplicit) return String(fromExplicit).toUpperCase()

    const fromString = pickFirst(h, ['total_rate.lowest', 'rate_per_night.lowest', 'price'])
    if (fromString) {
      const s = String(fromString).toUpperCase()
      if (s.includes('US$')) return 'USD'
      const m = s.match(/\b[A-Z]{3}\b/)
      if (m) return m[0]
    }
    return 'EUR'
  }

  const getPrice = h => {
    const n =
      pickFirst(h, [
        'total_rate.rate_per_night.extracted_lowest',
        'total_rate.extracted_before_taxes_fees',
        'rate_per_night.extracted_lowest',
        'rate_per_night.extracted_before_taxes_fees',
        'total_rate.extracted',
        'rate_per_night.extracted',
        'price.extracted',
        'price',
      ]) ?? null

    return getNumber(n)
  }

  const nights = getNights(from || checkIn, to || checkOut)

  const offers = hotels
    .map(h => {
      const name = pickFirst(h, ['name', 'title'], 'Nepoznato')

      const rating = getNumber(pickFirst(h, ['overall_rating', 'rating', 'reviews_rating']))
      const stars =
        getNumber(
          pickFirst(h, ['extracted_hotel_class', 'hotel_class', 'stars', 'hotel_class_rating']),
        ) ?? null

      const priceTotal = getPrice(h)
      const currency = getCurrency(h)

      const distanceStr = pickFirst(h, ['distance'])
      const distanceKm = getNumber(distanceStr)

      const link =
        pickFirst(h, ['link', 'serpapi_property_details_link', 'website']) ||
        (h?.property_token ? String(h.property_token) : null)

      const reviewsCount =
        getNumber(pickFirst(h, ['reviews', 'reviews_count', 'total_reviews'])) ?? null

      const checkInTime = pickFirst(h, ['check_in_time']) ?? null
      const checkOutTime = pickFirst(h, ['check_out_time']) ?? null

      const amenities = Array.isArray(h?.amenities) ? h.amenities.slice(0, 8) : []

      const thumbnail = h?.images?.[0]?.thumbnail || h?.images?.[0]?.original_image || null

      const images = Array.isArray(h?.images)
        ? h.images.slice(0, 8).map(img => ({
            thumbnail: img?.thumbnail || null,
            original: img?.original_image || null,
          }))
        : []

      const deal = pickFirst(h, ['deal', 'deal_description']) ?? null

      const coords = h?.gps_coordinates
        ? {
            lat: getNumber(h.gps_coordinates.latitude),
            lon: getNumber(h.gps_coordinates.longitude),
          }
        : null

      const beforeTaxes =
        getNumber(
          pickFirst(h, [
            'total_rate.extracted_before_taxes_fees',
            'rate_per_night.extracted_before_taxes_fees',
          ]),
        ) ?? null

      const totalForStay = priceTotal ? priceTotal * nights : null

      console.log(budget, totalForStay, priceTotal)

      if (budget != null && totalForStay != null && totalForStay > budget * 1.05) return null

      return {
        accommodation: {
          name,
          type: 'hotel',
          stars,
          rating,
          distance_from_center_km: distanceKm,

          reviews_count: reviewsCount,
          amenities,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          coordinates: coords,
          deal,
        },
        price: {
          total: totalForStay,
          currency,
          per_night: priceTotal,
          before_taxes_fees: beforeTaxes,
        },
        media: {
          thumbnail,
          images,
        },
        transport: {
          type: 'unknown',
          from: null,
          to: destination,
          estimated_duration: null,
        },
        availability: null,
        source: link ? { link: String(link) } : null,

        provider_meta: {
          property_token: h?.property_token ?? null,
          serpapi_property_details_link: h?.serpapi_property_details_link ?? null,
          serpapi_reviews_link: h?.serpapi_google_hotels_reviews_link ?? null,
        },

        ai_explanation: null,
      }
    })
    .filter(Boolean)

  return offers
}

async function searchFlights({ destination, fromCity, from, to, lang, budget }) {
  if (!fromCity || !destination) return []

  try {
    const [departure_id, arrival_id] = await Promise.all([
      resolveFlightId(fromCity, { lang }),
      resolveFlightId(destination, { lang }),
    ])

    if (!departure_id) {
      console.log('Could not resolve departure_id for:', fromCity)
      return []
    }
    if (!arrival_id) {
      console.log('Could not resolve arrival_id for:', destination)
      return []
    }

    const data = await serpapi({
      engine: 'google_flights',
      hl: lang === 'sr' ? 'sr' : 'en',
      departure_id,
      arrival_id,
      outbound_date: from || undefined,
      return_date: to || undefined,
      currency: DEFAULT_CURRENCY,
    })

    const flights = data?.best_flights || data?.other_flights || []

    return flights
      .slice(0, MAX_FLIGHTS)
      .map(f => {
        const priceTotal =
          safeNumber(f?.price) || safeNumber(f?.price?.value) || safeNumber(f?.price?.extracted)

        const currency = (f?.price?.currency || DEFAULT_CURRENCY).toString().toUpperCase()
        const duration = pick(f, ['total_duration', 'duration']) || null
        const link =
          pick(f, ['link', 'booking_link', 'serpapi_flights_results_link']) ||
          data?.serpapi_flights_results_link ||
          null

        const airline = pick(f, ['airline']) || f?.flights?.[0]?.airline || null

        const airlineLogo = pick(f, ['airline_logo']) || f?.flights?.[0]?.airline_logo || null

        if (budget != null && priceTotal != null && priceTotal > Number(budget)) return null

        return {
          accommodation: null,
          price: {
            total: priceTotal ?? null,
            currency,
            per_person: true,
          },
          transport: {
            type: 'flight',
            from: departure_id,
            to: arrival_id,
            estimated_duration: duration ? String(duration) : null,
            airline: airline,
            airline_logo: airlineLogo,
          },
          availability: null,
          source: link ? { link: String(link) } : null,
          ai_explanation: null,
        }
      })
      .filter(Boolean)
  } catch (e) {
    console.log(e?.response?.data?.error || e?.message || e)
    return []
  }
}

module.exports = async function serpapiTravelSearch(params) {
  if (!process.env.SERPAPI_KEY) throw new Error('SERPAPI_KEY is not set')

  const { destination, from, to, lang, budget, adults } = params
  const fromCity = params.fromCity || params.departure || 'Beograd'

  const hotelOffers = await searchHotels({ destination, from, to, lang, budget, adults })
  const flightOffers = await searchFlights({
    destination,
    fromCity,
    from,
    to,
    lang,
    budget,
    adults,
  })

  return {
    destination,
    offers: [...hotelOffers.slice(0, MAX_HOTELS), ...flightOffers.slice(0, MAX_FLIGHTS)],
  }
}
