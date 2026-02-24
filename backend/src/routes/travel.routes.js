const express = require('express')
const serpapiTravelSearch = require('../services/serpapiTravelSearch')
const { travelPlanner } = require('../ai/travelPlanner')

const router = express.Router()

/**
 * @swagger
 * /api/travel/search:
 *   get:
 *     summary: Pretraga turističkih ponuda
 *     description: Pretražuje turističke ponude za zadatu destinaciju. Opcionalno može generisati AI objašnjenja za svaku ponudu.
 *     tags: [Travel]
 *     parameters:
 *       - in: query
 *         name: destination
 *         required: true
 *         description: Naziv destinacije
 *         schema:
 *           type: string
 *           example: Rim
 *       - in: query
 *         name: from
 *         description: Datum polaska
 *         schema:
 *           type: string
 *           example: "2026-05-01"
 *       - in: query
 *         name: to
 *         description: Datum povratka
 *         schema:
 *           type: string
 *           example: "2026-05-04"
 *       - in: query
 *         name: budget
 *         description: Budžet u evrima
 *         schema:
 *           type: number
 *           example: 500
 *       - in: query
 *         name: interests
 *         description: Interesovanja (zarezom razdvojena)
 *         schema:
 *           type: string
 *           example: muzeji,hrana
 *       - in: query
 *         name: type
 *         description: Tip smeštaja ili putovanja
 *         schema:
 *           type: string
 *           example: hotel
 *       - in: query
 *         name: lang
 *         description: Jezik odgovora (sr ili en)
 *         schema:
 *           type: string
 *           enum: [sr, en]
 *           example: sr
 *       - in: query
 *         name: explain
 *         description: Da li AI treba da objasni svaku ponudu (true/false)
 *         schema:
 *           type: string
 *           example: true
 *       - in: query
 *         name: fromCity
 *         description: Grad polaska
 *         schema:
 *           type: string
 *           example: Beograd
 *     responses:
 *       200:
 *         description: Uspešno izvršena pretraga
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 destination:
 *                   type: string
 *                   example: Rim
 *                 criteria:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       nullable: true
 *                     to:
 *                       type: string
 *                       nullable: true
 *                     budget:
 *                       type: number
 *                       nullable: true
 *                     interests:
 *                       type: string
 *                       nullable: true
 *                     type:
 *                       type: string
 *                       nullable: true
 *                     lang:
 *                       type: string
 *                       example: sr
 *                 offers:
 *                   type: array
 *                   description: Lista pronađenih ponuda
 *                   items:
 *                     type: object
 *       400:
 *         description: Nevalidni parametri zahteva
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Niste uneli destinaciju
 *       500:
 *         description: Greška prilikom pretrage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Neuspešna pretraga putovanja
 *                 error:
 *                   type: string
 */
router.get('/travel/search', async (req, res) => {
  try {
    const destination = (req.query.destination || '').toString().trim()
    const from = (req.query.from || '').toString().trim()
    const to = (req.query.to || '').toString().trim()
    const interests = (req.query.interests || '').toString().trim()
    const type = (req.query.type || '').toString().trim()
    const lang = ((req.query.lang || 'sr').toString().trim() || 'sr').toLowerCase()
    const budgetRaw = (req.query.budget || '').toString().trim()
    const budget = budgetRaw ? Number(budgetRaw) : null

    const explain = ['1', 'true', 'yes'].includes(String(req.query.explain || '').toLowerCase())

    if (!destination) return res.status(400).json({ message: 'Niste uneli destinaciju' })
    if (budgetRaw && Number.isNaN(budget))
      return res.status(400).json({ message: 'Budžet mora biti broj' })
    if (!['sr', 'en'].includes(lang))
      return res.status(400).json({ message: 'Jezik mora biti srpski ili engleski' })

    const params = { destination, from, to, budget: budget ?? undefined, interests, type, lang }

    const searchResult = await serpapiTravelSearch({
      ...params,
      fromCity: req.query.fromCity ? String(req.query.fromCity).trim() : undefined,
    })

    const dest = searchResult?.destination || destination
    const offers = Array.isArray(searchResult?.offers) ? searchResult.offers : []

    if (explain && offers.length > 0) {
      const aiUserMessage =
        lang === 'en'
          ? 'Explain briefly (1-2 sentences) why each offer is recommended, considering budget, interests, and distance if available.'
          : 'Objasni kratko (1-2 rečenice) zašto je svaka ponuda preporučena, uzimajući u obzir budžet, interesovanja i udaljenost ako postoji.'

      const ai = await travelPlanner({
        userMessage: aiUserMessage,
        params: {
          destination: dest,
          from: from || null,
          to: to || null,
          budget_eur: budget ?? null,
          interests: interests
            ? interests
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
            : [],
          type: type || null,
          language: lang,
        },
      })

      const aiOffers = Array.isArray(ai?.offers) ? ai.offers : []

      for (let i = 0; i < offers.length; i++) {
        offers[i].ai_explanation = aiOffers[i]?.ai_explanation || offers[i].ai_explanation || null
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
    })
  } catch (e) {
    return res.status(500).json({
      message: 'Neuspešna pretraga putovanja',
      error: e.response?.data || e.message,
    })
  }
})

module.exports = router
