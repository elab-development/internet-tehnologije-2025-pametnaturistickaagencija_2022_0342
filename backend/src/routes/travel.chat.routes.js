const express = require("express");
const { planTravel } = require("../ai/travelPlanner");

const router = express.Router();

router.post("/travel/chat", async (req, res) => {
  try {
    const message = (req.body?.message || "").toString().trim();
    const params = req.body?.params || {};

    if (!message) {
      return res.status(400).json({ message: "Missing body.message" });
    }

    const result = await planTravel({ userMessage: message, params });
    return res.json(result);
  } catch (e) {
    return res.status(500).json({
      message: "Travel chat failed",
      error: e.message,
    });
  }
});

module.exports = router;
