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

router.get('/', (req, res) => {
  try {
    const settings = readSettings()
    return res.json({ success: true, data: settings })
  } catch (error) {
    console.error('Settings API GET error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

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
