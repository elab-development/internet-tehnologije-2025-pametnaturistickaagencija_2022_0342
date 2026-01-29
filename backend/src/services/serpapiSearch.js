const axios = require("axios");

async function serpapiSearch(query, num = 5) {
  const r = await axios.get("https://serpapi.com/search.json", {
    params: {
      api_key: process.env.SERPAPI_KEY,
      engine: "google",
      q: query,
      num,
    },
    timeout: 15000,
  });

  const items = r.data.organic_results || [];

  return items.map((it) => ({
    title: it.title,
    link: it.link,
    snippet: it.snippet || "",
    source: it.source || "",
  }));
}

module.exports = serpapiSearch;