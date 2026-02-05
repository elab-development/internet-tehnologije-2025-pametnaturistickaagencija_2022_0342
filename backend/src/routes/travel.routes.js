const express = require("express");
const serpapiTravelSearch = require("../services/serpapiTravelSearch");
const { travelPlanner } = require("../ai/travelPlanner");

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
    const budget = budgetRaw ? Number(budgetRaw) : null;

    const explain = ["1", "true", "yes"].includes(String(req.query.explain || "").toLowerCase());

    if (!destination) return res.status(400).json({ message: "Niste uneli destinaciju" });
    if (budgetRaw && Number.isNaN(budget)) return res.status(400).json({ message: "Budžet mora biti broj" });
    if (!["sr", "en"].includes(lang)) return res.status(400).json({ message: "Jezik mora biti srpski ili engleski" });

    const params = { destination, from, to, budget: budget ?? undefined, interests, type, lang };

    
    const searchResult = await serpapiTravelSearch({
      ...params,
      fromCity: req.query.fromCity ? String(req.query.fromCity).trim() : undefined, 
    });

    const dest = searchResult?.destination || destination;
    const offers = Array.isArray(searchResult?.offers) ? searchResult.offers : [];

  
    if (explain && offers.length > 0) {
      const aiUserMessage =
        lang === "en"
          ? "Explain briefly (1-2 sentences) why each offer is recommended, considering budget, interests, and distance if available."
          : "Objasni kratko (1-2 rečenice) zašto je svaka ponuda preporučena, uzimajući u obzir budžet, interesovanja i udaljenost ako postoji.";

      const ai = await travelPlanner({
        userMessage: aiUserMessage,
        params: {
          destination: dest,
          from: from || null,
          to: to || null,
          budget_eur: budget ?? null,
          interests: interests ? interests.split(",").map(s => s.trim()).filter(Boolean) : [],
          type: type || null,
          language: lang,
          
        },
       
      });

      
      const aiOffers = Array.isArray(ai?.offers) ? ai.offers : [];

     
      for (let i = 0; i < offers.length; i++) {
        offers[i].ai_explanation = aiOffers[i]?.ai_explanation || offers[i].ai_explanation || null;
      }
    }

   
    return res.json({
      destination: dest,
      criteria: {
        from: from || null,
        to: to || null,
        budget: budget ?? null,
        interests: interests || null,
        type: type || null,
        lang,
      },
      offers,
    });
  } catch (e) {
    return res.status(500).json({
      message: "Neuspešna pretraga putovanja",
      error: e.response?.data || e.message,
    });
  }
});

module.exports = router;
