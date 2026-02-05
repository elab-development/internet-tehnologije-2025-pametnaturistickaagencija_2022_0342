const axios = require("axios");

const SERPAPI_URL = "https://serpapi.com/search.json";


function safeNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}


function defaultDates() {
  const now = new Date();
  const checkIn = new Date(now);
  checkIn.setDate(checkIn.getDate() + 14);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  return { checkIn: formatDate(checkIn), checkOut: formatDate(checkOut) };
}

async function serpapi(params) {
  const r = await axios.get(SERPAPI_URL, {
    params: {
      api_key: process.env.SERPAPI_KEY,
      ...params,
    },
    timeout: 20000,
  });
  return r.data;
}


async function searchHotels({ destination, from, to, lang, budget }) {
  const { checkIn, checkOut } = defaultDates();

  const data = await serpapi({
    engine: "google_hotels",
    q: `hotels in ${destination}`,
    hl: lang === "sr" ? "sr" : "en",

    
    check_in_date: from || checkIn,
    check_out_date: to || checkOut,

    adults: 2,
  });

  const hotels = data?.properties || data?.hotel_results || [];

  const offers = hotels
    .map((h) => {
      const name = pick(h, ["name", "title"]) || "Nepoznato";
      const rating = safeNumber(pick(h, ["overall_rating", "rating", "reviews_rating"]));
      const stars = safeNumber(pick(h, ["hotel_class", "stars"]));

      
      const priceTotal =
        safeNumber(pick(h, ["total_rate", "rate_per_night", "price"])) ||
        safeNumber(h?.rate_per_night?.extracted) ||
        safeNumber(h?.total_rate?.extracted);

      const currency =
        (pick(h, ["currency"]) ||
          h?.rate_per_night?.currency ||
          h?.total_rate?.currency ||
          "EUR")
          .toString()
          .toUpperCase();

      const distanceStr = pick(h, ["distance"]);
      const distanceKm = safeNumber(distanceStr);

      const link =
        pick(h, ["link", "serpapi_property_details_link", "website"]) ||
        (h?.property_token ? String(h.property_token) : null);

      
      if (budget && priceTotal && priceTotal > budget) return null;

      return {
        accommodation: {
          name,
          type: "hotel",
          stars: stars ?? null,
          rating: rating ?? null,
          distance_from_center_km: distanceKm ?? null,
        },
        price: {
          total: priceTotal ?? null,
          currency,
          per_person: false,
        },
        transport: {
          type: "unknown",
          from: null,
          to: destination,
          estimated_duration: null,
        },
        availability: null,
        source: link ? { link: String(link) } : null,
        ai_explanation: null,
      };
    })
    .filter(Boolean);

  return offers;
}


async function searchFlights({ destination, fromCity, from, to, lang, budget }) {
  
  if (!fromCity) return [];

  try {
    const data = await serpapi({
      engine: "google_flights",
      hl: lang === "sr" ? "sr" : "en",

      
      departure_id: fromCity,
      arrival_id: destination,

      outbound_date: from || undefined,
      return_date: to || undefined,

      currency: "EUR",
    });

    const flights = data?.best_flights || data?.other_flights || [];

    return flights
      .slice(0, 5)
      .map((f) => {
        const priceTotal =
          safeNumber(f?.price) ||
          safeNumber(f?.price?.value) ||
          safeNumber(f?.price?.extracted);

        const currency = (f?.price?.currency || "EUR").toString().toUpperCase();
        const duration = pick(f, ["total_duration", "duration"]) || null;
        const link = pick(f, ["link", "booking_link", "serpapi_flights_results_link"]);

        if (budget && priceTotal && priceTotal > budget) return null;

        return {
          accommodation: null,
          price: {
            total: priceTotal ?? null,
            currency,
            per_person: true,
          },
          transport: {
            type: "flight",
            from: fromCity,
            to: destination,
            estimated_duration: duration ? String(duration) : null,
          },
          availability: null,
          source: link ? { link: String(link) } : null,
          ai_explanation: null,
        };
      })
      .filter(Boolean);
  } catch (e) {
    
    return [];
  }
}


module.exports = async function serpapiTravelSearch(params) {
  if (!process.env.SERPAPI_KEY) throw new Error("SERPAPI_KEY is not set");

  const { destination, from, to, lang, budget } = params;


  const fromCity = params.fromCity || params.departure || "Beograd";

  
  const hotelOffers = await searchHotels({ destination, from, to, lang, budget });

 
  const flightOffers = await searchFlights({ destination, fromCity, from, to, lang, budget });

  return {
    destination,
    offers: [...hotelOffers.slice(0, 8), ...flightOffers.slice(0, 5)],
  };
};
