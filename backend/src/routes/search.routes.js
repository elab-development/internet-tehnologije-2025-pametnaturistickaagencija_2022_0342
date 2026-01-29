const express = require("express");
const serpapiSearch = require("../services/serpapiSearch");

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const num = Math.min(parseInt(req.query.num || "5", 10) || 5, 10);

    if (!q) {
      return res.status(400).json({ message: "Missing query param: q" });
    }

    if (!process.env.SERPAPI_KEY) {
      return res.status(500).json({ message: "SERPAPI_KEY is not set" });
    }

    const results = await serpapiSearch(q, num);
    return res.json({ query: q, results });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Search failed", error: e.response?.data || e.message });
  }
});

module.exports = router;