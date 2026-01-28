'use client'

interface DatePickerProps {
  label: string
  value: string
  onChange: (date: string) => void
  required?: boolean
  minDate?: string
}

export function DatePicker({ label, value, onChange, required, minDate }: DatePickerProps) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={minDate || today}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        required={required}
      />
    </div>
  )
}
