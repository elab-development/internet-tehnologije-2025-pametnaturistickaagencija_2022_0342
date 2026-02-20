'use client'

import { useState } from 'react'
import { DatePicker } from '@/app/components/ui/DatePicker'
import { BudgetSlider } from '@/app/components/ui/BudgetSlider'
import { Button } from '@/app/components/ui/Button'
import { Alert } from '@/app/components/ui/Alert'
import { SearchParams } from '@/lib/types/search'

interface SearchFormProps {
  onSubmit: (params: SearchParams) => void
  isLoading: boolean
}

export function SearchForm({ onSubmit, isLoading }: SearchFormProps) {
  const todaysDate = new Date()
  const today = todaysDate.toISOString().split('T')[0]
  const tomorrow = new Date(
    todaysDate.getFullYear(),
    todaysDate.getMonth(),
    todaysDate.getDate() + 9,
  )
    .toISOString()
    .split('T')[0]

  const [formData, setFormData] = useState<SearchParams>({
    startDate: today,
    endDate: tomorrow,
    budget: 2000,
    destination: 'Budva',
    passengers: 1,
    preferences: [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: keyof SearchParams, value: number | string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}

    if (!formData.startDate) newErrors.startDate = 'Unesite datum polaska'
    if (!formData.endDate) newErrors.endDate = 'Unesite datum povratka'
    if (!formData.destination.trim()) newErrors.destination = 'Unesite destinaciju'
    if (formData.passengers < 1) newErrors.passengers = 'Broj putnika mora biti najmanje 1'

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'Datum povratka mora biti posle datuma polaska'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(formData)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-800">🤖 AI Pretraga Putovanja</h2>
      <p className="text-gray-600 mt-1 mb-6">
        Naš napredni AI će analizirati vaše zahteve i pronaći optimalne ponude
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Datum polaska"
            value={formData.startDate}
            onChange={date => handleChange('startDate', date)}
            required
            minDate={today}
          />

          <DatePicker
            label="Datum povratka"
            value={formData.endDate}
            onChange={date => handleChange('endDate', date)}
            required
            minDate={formData.startDate || tomorrow}
          />
        </div>

        {errors.startDate && <Alert type="error" message={errors.startDate} />}
        {errors.endDate && <Alert type="error" message={errors.endDate} />}

        <BudgetSlider
          value={formData.budget}
          onChange={value => handleChange('budget', value)}
          min={100}
          max={3000}
          step={50}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destinacija
              <span className="text-red-500"> *</span>
            </label>
            <input
              type="text"
              value={formData.destination}
              onChange={e => handleChange('destination', e.target.value)}
              placeholder="npr. Grčka, Hrvatska, Budva..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            {errors.destination && (
              <p className="mt-1 text-sm text-red-600">{errors.destination}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Broj putnika
              <span className="text-red-500"> *</span>
            </label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleChange('passengers', Math.max(1, formData.passengers - 1))}
                className="px-3 py-1 border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100"
              >
                -
              </button>

              <input
                type="number"
                value={formData.passengers}
                onChange={e => handleChange('passengers', parseInt(e.target.value) || 1)}
                min="1"
                max="10"
                className="w-16 px-3 py-2 border-t border-b border-gray-300 text-center"
              />

              <button
                type="button"
                onClick={() => handleChange('passengers', Math.min(10, formData.passengers + 1))}
                className="px-3 py-1 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100"
              >
                +
              </button>
            </div>
            {errors.passengers && <p className="mt-1 text-sm text-red-600">{errors.passengers}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dodatne preference (opciono)
          </label>
          <div className="flex flex-wrap gap-2">
            {['plaza', 'planina', 'grad', 'aventura', 'romantika', 'porodica'].map(pref => (
              <button
                key={pref}
                type="button"
                onClick={() => {
                  const newPrefs = formData.preferences?.includes(pref)
                    ? formData.preferences.filter(p => p !== pref)
                    : [...(formData.preferences || []), pref]
                  handleChange('preferences', newPrefs)
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  formData.preferences?.includes(pref)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
            className="w-full py-3 text-lg"
          >
            {isLoading ? (
              <>
                <span className="animate-pulse">🤔</span> AI analizira...
              </>
            ) : (
              <>
                <span className="mr-2">🔍</span> Pronađi AI preporuke
              </>
            )}
          </Button>

          <p className="text-sm text-gray-500 mt-2 text-center">
            Naš AI će analizirati vaše zahteve i pronaći najbolje ponude
          </p>
        </div>
      </form>
    </div>
  )
}
