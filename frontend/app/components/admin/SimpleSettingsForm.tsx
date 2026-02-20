// components/admin/settings/SimpleSettingsForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Moon, Sun, Globe, Mail, Bell, Eye, EyeOff } from 'lucide-react'

interface Settings {
  siteName: string
  siteDescription: string
  itemsPerPage: number
  theme: 'light' | 'dark'
  contactEmail: string
}

interface Props {
  initialData: Settings | null
}

// Default podešavanja
const defaultSettings: Settings = {
  siteName: 'Moja Aplikacija',
  siteDescription: 'Opis sajta',
  itemsPerPage: 10,
  theme: 'light',
  contactEmail: 'kontakt@example.com',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function SimpleSettingsForm({ initialData }: Props) {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>(initialData || defaultSettings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Učitaj iz localStorage ako nema server podataka
  useEffect(() => {
    if (!initialData) {
      const saved = localStorage.getItem('appSettings')
      if (saved) {
        try {
          setSettings(JSON.parse(saved))
        } catch (e) {
          console.error('Error loading settings from localStorage')
        }
      }
    }
  }, [initialData])

  const handleChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Prvo pokušaj sa serverom
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        // Sačuvaj i u localStorage kao backup
        localStorage.setItem('appSettings', JSON.stringify(settings))

        setMessage({
          type: 'success',
          text: 'Podešavanja su uspešno sačuvana!',
        })
        router.refresh()
      } else {
        // Ako server ne radi, sačuvaj samo u localStorage
        localStorage.setItem('appSettings', JSON.stringify(settings))
        setMessage({
          type: 'success',
          text: 'Podešavanja su sačuvana lokalno (server nije dostupan)',
        })
      }
    } catch (error) {
      // Ako server nije dostupan, sačuvaj u localStorage
      localStorage.setItem('appSettings', JSON.stringify(settings))
      setMessage({
        type: 'success',
        text: 'Podešavanja su sačuvana lokalno',
      })
    } finally {
      setSaving(false)

      // Primeni temu odmah
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleReset = () => {
    if (confirm('Da li ste sigurni da želite da resetujete podešavanja na default?')) {
      setSettings(defaultSettings)
      localStorage.removeItem('appSettings')
      setMessage({ type: 'success', text: 'Podešavanja su resetovana' })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header sa akcijama */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Osnovna podešavanja</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900"
          >
            {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
            {showPreview ? 'Sakrij pregled' : 'Prikaži pregled'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Resetuj
          </button>
        </div>
      </div>

      {/* Status poruka */}
      {message && (
        <div
          className={`mx-6 mt-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Preview sekcija */}
      {showPreview && (
        <div className="mx-6 mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <h3 className="font-medium text-gray-700 mb-2">Pregled podešavanja:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Naziv sajta:</span> {settings.siteName}
            </div>
            <div>
              <span className="text-gray-500">Tema:</span>{' '}
              {settings.theme === 'dark' ? '🌙 Tamna' : '☀️ Svetla'}
            </div>
            <div>
              <span className="text-gray-500">Stavki po strani:</span> {settings.itemsPerPage}
            </div>
          </div>
        </div>
      )}

      {/* Forma */}
      <div className="p-6 space-y-6">
        {/* Osnovni podaci */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Osnovni podaci</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Naziv sajta</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={e => handleChange('siteName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Unesite naziv sajta"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Opis sajta</label>
            <textarea
              value={settings.siteDescription}
              onChange={e => handleChange('siteDescription', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kratak opis sajta"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kontakt email</label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="email"
                value={settings.contactEmail}
                onChange={e => handleChange('contactEmail', e.target.value)}
                className="w-full pl-10 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="kontakt@example.com"
              />
            </div>
          </div>
        </div>

        {/* Podešavanja prikaza */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Podešavanja prikaza</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('theme', 'light')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                    settings.theme === 'light'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Sun size={18} />
                  Svetla
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('theme', 'dark')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                    settings.theme === 'dark'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Moon size={18} />
                  Tamna
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Broj stavki po strani
            </label>
            <select
              value={settings.itemsPerPage}
              onChange={e => handleChange('itemsPerPage', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        {/* JSON prikaz (za debugging) */}
        <details className="pt-4 border-t border-gray-200">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            Prikaži JSON podešavanja
          </summary>
          <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs overflow-auto">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </details>

        {/* Save dugme */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <Save size={20} />
            {saving ? 'Čuvanje...' : 'Sačuvaj podešavanja'}
          </button>
        </div>
      </div>
    </div>
  )
}
