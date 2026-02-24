const express = require("express");
const { travelPlanner } = require("../ai/travelPlanner");

const router = express.Router();

/**
 * @swagger
 * /api/travel/chat:
 *   post:
 *     summary: AI chat za planiranje putovanja
 *     description: Prima korisničku poruku i opcione parametre, zatim generiše plan putovanja korišćenjem AI modula.
 *     tags: [Travel Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 description: Korisnička poruka sa zahtevom za plan putovanja
 *                 example: Želim vikend putovanje u Rim do 500€
 *               params:
 *                 type: object
 *                 description: Dodatni parametri za planiranje (opciono)
 *                 example:
 *                   destination: Rim
 *                   budget: 500
 *                   days: 3
 *                   language: sr
 *     responses:
 *       200:
 *         description: Uspešno generisan plan putovanja
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: AI generisani plan putovanja
 *       400:
 *         description: Nedostaje obavezno polje message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Missing body.message
 *       500:
 *         description: Greška prilikom generisanja plana
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Travel chat failed
 *                 error:
 *                   type: string
 *                   example: Internal error
 */
router.post("/travel/chat", async (req, res) => {
  try {
    const message = (req.body?.message || "").toString().trim();
    const params = (req.body?.params && typeof req.body.params === "object") ? req.body.params : {};

    if (!message) {
      return res.status(400).json({ message: "Missing body.message" });
    }

    const result = await travelPlanner({
      userMessage: message,
      params,
    });

    return res.json(result);
  } catch (e) {
    return res.status(500).json({
      message: "Travel chat failed",
      error: e?.message || String(e),
    });
  }
});

module.exports = router;
