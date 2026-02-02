'use client'

import { useState } from 'react'
import { SearchForm } from '@/app/components/search/SearchForm'
import { SearchResults } from '@/app/components/search/SearchResults'
import { AIRecommendation } from '@/app/components/search/AIRecommendation'
import { Alert } from '@/app/components/ui/Alert'
import { searchTravelOffers } from '@/lib/mock-ai/ai-service'
import { SearchParams, TravelOffer, AIResponse } from '@/lib/types/search'
import { useAuth } from '@/app/context/AuthContext'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function SearchPage() {
  const { user, token } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<AIResponse | null>(null)
  const [error, setError] = useState<string>('')

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true)
    setError('')
    setSearchResults(null)

    try {
      const result = await searchTravelOffers(params)
      setSearchResults(result)

      if (!result.success) {
        setError(result.message || 'Došlo je do greške pri pretrazi')
      }
    } catch (err) {
      setError('Došlo je do greške pri pretrazi. Pokušajte ponovo.')
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveOffer = async (offer: TravelOffer) => {
    if (!user || user.role === 'GUEST') {
      alert('Morate biti prijavljeni da biste sačuvali ponudu')
      return
    }

    // TODO: Implementirati API poziv za čuvanje ponude
    alert(`Ponuda "${offer.name}" je sačuvana u vašoj listi!`)

    const { name, price, siteLinks, offerType, date } = offer

    try {
      const response = await fetch(`${API_URL}/saved-offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, price, siteLinks, offerType, date }),
      })

      console.log(response)
    } catch (error) {
      console.error('Saving error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🤖 Pametna AI Pretraga Putovanja</h1>
              <p className="text-gray-600 mt-2">
                Unesite parametre vašeg putovanja i naš AI će pronaći najbolje ponude
              </p>
            </div>

            <div className="flex space-x-4">
              {user && user.role !== 'GUEST' ? (
                <Link
                  href="/saved"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Sačuvane ponude
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Prijavi se za više opcija
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-2xl mb-2">1️⃣</div>
              <div className="font-medium">Unos parametara</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-2xl mb-2">2️⃣</div>
              <div className="font-medium">AI analiza</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-2xl mb-2">3️⃣</div>
              <div className="font-medium">Generisanje filtera</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-2xl mb-2">4️⃣</div>
              <div className="font-medium">Preporuke</div>
            </div>
          </div>
        </div>

        <SearchForm onSubmit={handleSearch} isLoading={isLoading} />

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {searchResults?.success && <AIRecommendation aiResponse={searchResults} />}

        {searchResults && (
          <SearchResults
            offers={searchResults.offers}
            isLoading={isLoading}
            onSaveOffer={handleSaveOffer}
          />
        )}

        {!searchResults && !isLoading && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">💡 Kako radi AI pretraga?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-700 mb-2">1. Analiza zahteva</h4>
                <p className="text-sm text-gray-600">
                  AI model analizira vaš budžet, destinaciju i preferencije
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-700 mb-2">2. Generisanje filtera</h4>
                <p className="text-sm text-gray-600">
                  Automatski se kreiraju optimalni filteri za pretragu
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-700 mb-2">3. Personalizovane preporuke</h4>
                <p className="text-sm text-gray-600">
                  Dobijate ponude sa AI objašnjenjem zašto su preporučene
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
