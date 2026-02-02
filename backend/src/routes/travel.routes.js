const express = require("express");
const serpapiTravelSearch = require("../services/serpapiTravelSearch");

const router = express.Router();

router.get("/travel/search", async (req, res) => {
  try {
    const destination = (req.query.destination || "").toString().trim();
    const from = (req.query.from || "").toString().trim();
    const to = (req.query.to || "").toString().trim();
    const interests = (req.query.interests || "").toString().trim();
    const type = (req.query.type || "").toString().trim();
    const lang = ((req.query.lang || "sr").toString().trim() || "sr").toLowerCase();
    const budgetRaw = (req.query.budget || "").toString().trim();
    const budget = budgetRaw ? Number(budgetRaw) : undefined;

    if (!destination) {
      return res.status(400).json({ message: "Niste uneli destinaciju" });
    }
    if (budgetRaw && Number.isNaN(budget)) {
      return res.status(400).json({ message: "Budžet mora biti broj" });
    }
    if (!["sr", "en"].includes(lang)) {
      return res.status(400).json({ message: "Jezik mora biti srpski ili engleski" });
    }

    const params = { destination, from, to, budget, interests, type, lang };
    const results = await serpapiTravelSearch(params);

    return res.json({ params, results });
  } catch (e) {
    return res.status(500).json({ message: "Neuspešna pretraga putovanja", error: e.response?.data || e.message });
  }
});

module.exports = router;
