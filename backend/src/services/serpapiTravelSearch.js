const axios = require("axios");

function buildQueries({ destination, type, interests, lang, budget }) {
  const t = type ? ` ${type}` : "";
  const i = interests ? ` ${interests}` : "";
  const b = budget ? ` budget ${budget}` : "";
  const base = `${destination}${t}${i}`.trim();

  if (lang === "sr") {
    return [
      `${base} šta posetiti`,
      `${base} plan putovanja 3 dana`,
      `${destination} smeštaj cene${b}`,
      `${destination} atrakcije ulaznice`,
    ];
  }

  return [
    `${base} things to do`,
    `${base} 3 day itinerary`,
    `${destination} accommodation prices${b}`,
    `${destination} attractions tickets`,
  ];
}

async function serpapiSearchOne(query) {
  const r = await axios.get("https://serpapi.com/search.json", {
    params: {
      api_key: process.env.SERPAPI_KEY,
      engine: "google",
      q: query,
      num: 5,
      safe: "active",
    },
    timeout: 15000,
  });

  return (r.data.organic_results || []).map((it) => ({
    title: it.title,
    link: it.link,
    snippet: it.snippet || "",
    source: it.source || "",
  }));
}

module.exports = async function serpapiTravelSearch(params) {
  if (!process.env.SERPAPI_KEY) {
    throw new Error("SERPAPI_KEY is not set");
  }

  const queries = buildQueries(params);
  const responses = await Promise.all(queries.map(serpapiSearchOne));
  const merged = responses.flat();

  const seen = new Set();
  return merged.filter((x) => (x.link && !seen.has(x.link) ? seen.add(x.link) : false));
};
