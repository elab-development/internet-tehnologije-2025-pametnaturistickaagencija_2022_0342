'use client'

import { AIResponse } from '@/lib/types/search'

interface AIRecommendationProps {
  aiResponse: AIResponse
}

export function AIRecommendation({ aiResponse }: AIRecommendationProps) {
  if (!aiResponse.success) return null

  return (
    <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
      <div className="flex items-start mb-4">
        <div className="shrink-0 bg-blue-100 p-3 rounded-full">
          <span className="text-2xl">🤖</span>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-800">AI Preporuka</h3>
          <p className="text-blue-600 text-sm">SmartTurist AI analiza</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="text-gray-700 mb-4">{aiResponse.explanation}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <div className="font-medium text-blue-700">Filter cene</div>
            <div>
              €{aiResponse.filters.priceRange[0]} - €{aiResponse.filters.priceRange[1]}
            </div>
          </div>

          <div className="bg-green-50 p-3 rounded">
            <div className="font-medium text-green-700">Prioritet lokacije</div>
            <div>{aiResponse.filters.locationPriority.join(', ')}</div>
          </div>

          <div className="bg-purple-50 p-3 rounded">
            <div className="font-medium text-purple-700">Obavezno uključuje</div>
            <div>{aiResponse.filters.mustHave.join(', ') || 'sve opcije'}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <span className="inline-flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          AI analiza završena u ~1.5s
        </span>
      </div>
    </div>
  )
}
