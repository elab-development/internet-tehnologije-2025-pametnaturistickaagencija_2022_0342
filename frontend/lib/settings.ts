// lib/settings.ts
import fs from 'fs'
import path from 'path'

const settingsPath = path.join(process.cwd(), '../backend/settings.json')

export function getSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')

      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading settings:', error)
  }

  // Default settings
  return {
    siteName: 'SmartTurist',
    siteDescription: 'Opis sajta',
    itemsPerPage: 10,
    contactEmail: 'kontakt@example.com',
    contactPhoneNumber: '38164123123',
  }
}
