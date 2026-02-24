const express = require('express')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')

const router = express.Router()

const settingsFilePath = path.join(process.cwd(), 'settings.json')

function getDefaultSettings() {
  return {
    siteName: 'Moja Aplikacija',
    siteDescription: 'Opis sajta',
    itemsPerPage: 10,
    contactEmail: 'kontakt@example.com',
    contactPhoneNumber: '38164123123',
  }
}

function readSettings() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading settings:', error)
  }
  return getDefaultSettings()
}

function writeSettings(settings) {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8')
    return true
  } catch (error) {
    console.error('Error writing settings:', error)
    return false
  }
}

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Preuzimanje podešavanja aplikacije (admin)
 *     description: Vraća podešavanja aplikacije sačuvana u settings.json (ako fajl ne postoji, vraća podrazumevana podešavanja).
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Uspešno vraćena podešavanja
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     siteName:
 *                       type: string
 *                       example: Moja Aplikacija
 *                     siteDescription:
 *                       type: string
 *                       example: Opis sajta
 *                     itemsPerPage:
 *                       type: number
 *                       example: 10
 *                     contactEmail:
 *                       type: string
 *                       example: kontakt@example.com
 *                     contactPhoneNumber:
 *                       type: string
 *                       example: "38164123123"
 *       500:
 *         description: Interna greška servera
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/', (req, res) => {
  try {
    const settings = readSettings()
    return res.json({ success: true, data: settings })
  } catch (error) {
    console.error('Settings API GET error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/admin/settings:
 *   post:
 *     summary: Čuvanje podešavanja aplikacije (admin)
 *     description: Upisuje podešavanja u settings.json i vraća sačuvane vrednosti.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               siteName:
 *                 type: string
 *                 example: Moja Aplikacija
 *               siteDescription:
 *                 type: string
 *                 example: Opis sajta
 *               itemsPerPage:
 *                 type: number
 *                 example: 10
 *               contactEmail:
 *                 type: string
 *                 example: kontakt@example.com
 *               contactPhoneNumber:
 *                 type: string
 *                 example: "38164123123"
 *     responses:
 *       200:
 *         description: Podešavanja su uspešno sačuvana
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: Podešavanja su uspešno sačuvana
 *       500:
 *         description: Greška pri čuvanju ili interna greška servera
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Greška pri čuvanju podešavanja
 */
router.post('/', (req, res) => {
  try {
    const body = req.body || {}

    const ok = writeSettings(body)

    if (!ok) {
      return res.status(500).json({ error: 'Greška pri čuvanju podešavanja' })
    }

    return res.json({
      success: true,
      data: body,
      message: 'Podešavanja su uspešno sačuvana',
    })
  } catch (error) {
    console.error('Settings API POST error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
