require("dotenv").config();
const axios = require("axios");

(async () => {
  try {
    const r = await axios.get("https://serpapi.com/search.json", {
      params: {
        api_key: process.env.SERPAPI_KEY,
        engine: "google",
        q: "Nikola Tesla",
        num: 5
      }
    });

    console.log("✅ SERPAPI RADI");
    const results = r.data.organic_results || [];
    results.slice(0, 3).forEach((it, i) => {
      console.log(`${i + 1}. ${it.title} — ${it.link}`);
    });
  } catch (e) {
    console.error("❌ SERPAPI FAIL", e.response?.data || e.message);
  }
})();