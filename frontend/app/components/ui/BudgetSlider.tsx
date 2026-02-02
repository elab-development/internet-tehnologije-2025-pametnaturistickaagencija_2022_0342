'use client'

import { useState, useEffect } from 'react'

interface BudgetSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

export function BudgetSlider({
  value,
  onChange,
  min = 100,
  max = 2000,
  step = 50,
}: BudgetSliderProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value)
    setLocalValue(newValue)
    onChange(newValue)
  }

  const formatCurrency = (amount: number) => {
    return `€${amount.toLocaleString()}`
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Budžet
          <span className="text-red-500"> *</span>
        </label>
        <span className="text-lg font-bold text-blue-600">{formatCurrency(localValue)}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{formatCurrency(min)}</span>
        <span>{formatCurrency(max)}</span>
      </div>
    </div>
  )
}
