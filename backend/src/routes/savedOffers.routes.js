const express = require('express')
const prisma = require('../prisma')
const auth = require('../middleware/auth')

const router = express.Router()

const OFFER_TYPE_MAP = {
  hotel: 'HOTEL',
  apartment: 'APARTMENT',
  house: 'HOUSE',
  villa: 'VILLA',
  hostel: 'HOSTEL',
  resort: 'RESORT',
  guesthouse: 'GUESTHOUSE',
}

router.use(auth)

/**
 * @swagger
 * /api/saved-offers:
 *   get:
 *     summary: Lista sačuvanih ponuda korisnika
 *     description: Vraća sve sačuvane ponude za ulogovanog korisnika sortirane po datumu kreiranja (opadajuće).
 *     tags: [Saved Offers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista sačuvanih ponuda
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Neautorizovan pristup
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = Number(req.user.userId)

    const offers = await prisma.savedOffer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    res.json(offers)
  } catch (e) {
    next(e)
  }
})

/**
 * @swagger
 * /api/saved-offers:
 *   post:
 *     summary: Dodavanje nove sačuvane ponude
 *     description: Kreira novu sačuvanu ponudu za ulogovanog korisnika.
 *     tags: [Saved Offers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, siteLinks, offerType, date]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Hotel Roma Centro
 *               price:
 *                 type: number
 *                 example: 450
 *               siteLinks:
 *                 type: object
 *                 description: Linkovi ka spoljnim sajtovima (JSON objekat)
 *                 example:
 *                   booking: "https://booking.com/example"
 *                   airbnb: "https://airbnb.com/example"
 *               offerType:
 *                 type: string
 *                 description: Tip ponude (hotel, apartment, house, villa, hostel, resort, guesthouse)
 *                 example: hotel
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-15"
 *     responses:
 *       201:
 *         description: Ponuda uspešno sačuvana
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Nedostaju obavezna polja ili nevalidan offerType
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Missing required fields
 *       401:
 *         description: Neautorizovan pristup
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = Number(req.user.userId)
    const { name, price, siteLinks, offerType, date } = req.body

    if (!name || price === undefined || !siteLinks || !offerType || !date) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const normalizedOfferTypeRaw = String(offerType || '')
      .trim()
      .toLowerCase()
    const normalizedOfferType = OFFER_TYPE_MAP[normalizedOfferTypeRaw] || null

    if (!normalizedOfferType) {
      return res.status(400).json({
        message: `Invalid offerType. Got "${offerType}".`,
      })
    }

    const offer = await prisma.savedOffer.create({
      data: {
        userId,
        name,
        price,
        siteLinks,
        offerType: normalizedOfferType,
        date: new Date(date),
      },
    })

    res.status(201).json(offer)
  } catch (e) {
    next(e)
  }
})

/**
 * @swagger
 * /api/saved-offers/{id}:
 *   delete:
 *     summary: Brisanje sačuvane ponude
 *     description: Briše sačuvanu ponudu ako pripada ulogovanom korisniku.
 *     tags: [Saved Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID sačuvane ponude
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       204:
 *         description: Ponuda uspešno obrisana
 *       401:
 *         description: Neautorizovan pristup
 *       404:
 *         description: Ponuda nije pronađena
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Saved offer not found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = Number(req.user.userId)
    const id = Number(req.params.id)

    const existing = await prisma.savedOffer.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return res.status(404).json({ message: 'Saved offer not found' })
    }

    await prisma.savedOffer.delete({ where: { id } })
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

module.exports = router