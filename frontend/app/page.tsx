'use client'

import { useAuth } from '@/app/context/AuthContext'
import { Button } from '@/app/components/ui/Button'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { SearchForm } from '@/app/components/search/SearchForm'
import { SearchResults } from '@/app/components/search/SearchResults'
import { AIRecommendation } from '@/app/components/search/AIRecommendation'
import { AIChat } from '@/app/components/chat/AIChat'
import { Alert } from '@/app/components/ui/Alert'
import { searchTravelOffers } from '@/lib/api/ai-search'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { user, logout } = useAuth()

  const router = useRouter()

  const getWelcomeMessage = () => {
    if (!user) return 'Dobrodošli na SmartTurist Platformu'

    switch (user.role) {
      case 'ADMIN':
        return `Dobrodošli, Administrator ${user.firstName || ''}`
      case 'USER':
        return `Dobrodošli, ${user.firstName || ''}`
      case 'GUEST':
        return 'Dobrodošli kao gost'
      default:
        return 'Dobrodošli na SmartTurist Platformu'
    }
  }

  const getDashboardContent = () => {
    if (!user || user.role === 'GUEST') {
      return (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Da biste pristupili svim funkcionalnostima, molimo vas da se registrujete ili prijavite.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/register">
              <Button variant="primary">Registrujte se</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Prijavite se</Button>
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Informacije o nalogu</h3>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Uloga:</strong> {user.role}
          </p>
          {user.firstName && (
            <p>
              <strong>Ime:</strong> {user.firstName}
            </p>
          )}

          <Button variant="primary" className="mt-3" onClick={() => router.push('/saved')}>
            Sačuvane ponude
          </Button>
        </div>

        {user.role === 'ADMIN' && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium mb-2 text-blue-900">Administratorske privilegije</h3>
            <ul className="list-disc list-inside text-blue-800">
              <li>Pregled svih korisnika</li>
              <li>Upravljanje sistemom</li>
              <li>Pristup svim funkcionalnostima</li>
            </ul>
          </div>
        )}
      </div>
    )
  }

  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [currentOffers, setCurrentOffers] = useState<any[]>([])
  const [currentFilters, setCurrentFilters] = useState<any>(null)

  const handleSearch = async (params: any) => {
    setIsLoading(true)
    setError('')
    setSearchResults(null)

    try {
      // SK3 Korak 4: Slanje zahteva pravom AI backend-u
      const result = await searchTravelOffers(params)
      setSearchResults(result)

      if (result.success) {
        setCurrentOffers(result.offers)
        setCurrentFilters(result.aiAnalysis?.filters)

        // Show AI service status
        if (!result.aiServiceAvailable) {
          setError('⚠️ AI servis trenutno nije dostupan. Koriste se osnovni filteri.')
        }
      } else {
        setError(result.message || 'Došlo je do greške pri pretrazi')
      }
    } catch (err: any) {
      setError(err.message || 'Došlo je do greške pri pretrazi. Pokušajte ponovo.')
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  console.log(searchResults)

  const handleSaveOffer = async (offer: any) => {
    if (!user || user.role === 'GUEST') {
      alert('Morate biti prijavljeni da biste sačuvali ponudu')
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Niste ulogovani (nema tokena).')
        return
      }

      const name = offer?.accommodation?.name
      const offerType = offer?.accommodation?.type // npr "hotel"
      const price = offer?.price?.total // broj
      const siteLinks = offer?.siteLinks?.length
        ? offer.siteLinks
        : offer?.source?.link
          ? [offer.source.link]
          : []

      if (!name || !offerType || price === undefined || price === null) {
        console.log('SAVE OFFER missing fields:', { name, offerType, price, siteLinks, offer })
        alert('Ponuda nema sve podatke (name/offerType/price).')
        return
      }

      const response = await fetch(`${API_URL}/saved-offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          price, // npr 1800
          siteLinks, // npr ["https://..."]
          offerType, // "hotel"
          date: new Date().toISOString(), // ili offer.checkIn/Out ako imaš
        }),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(json?.message || json?.error || 'Failed to save offer')
      }

      alert(`✅ Ponuda "${name}" je sačuvana u vašoj listi!`)
    } catch (error: any) {
      console.error('Save offer error:', error)
      alert(error?.message || 'Greška pri čuvanju ponude')
    }
  }

  const handleChatOffersUpdated = (offers: any[], filters?: any) => {
    setCurrentOffers(offers)
    if (filters) {
      setCurrentFilters(filters)
    }

    // Ažuriraj searchResults sa novim ponudama
    if (searchResults) {
      setSearchResults({
        ...searchResults,
        offers: offers,
        aiAnalysis: {
          ...searchResults.aiAnalysis,
          filters: filters || searchResults.aiAnalysis.filters,
        },
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{getWelcomeMessage()}</h1>
        </div>

        {getDashboardContent()}
      </div>

      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          {/* AI Info box */}
          {currentOffers.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-lg mr-4">
                  <span className="text-white text-2xl">✨</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Google Gemini AI Aktivan</h3>
                  <p className="text-sm text-gray-600">
                    Vaš zahtev se analizira naprednim AI modelom. Otvorite{' '}
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      AI Chat
                    </button>{' '}
                    za fino podešavanje pretrage razgovorom sa AI.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <>
          <SearchForm onSubmit={handleSearch} isLoading={isLoading} />

          {/* Error Message */}
          {error && (
            <Alert
              type={error.includes('AI servis') ? 'warning' : 'error'}
              message={error}
              onClose={() => setError('')}
              autoClose={error.includes('AI servis') ? 5000 : undefined}
            />
          )}

          {/* AI Recommendation */}
          {/* {searchResults?.success && <AIRecommendation aiResponse={searchResults} />} */}

          {/* Search Results */}
          {searchResults && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Pronađene ponude ({currentOffers.length})
                  </h2>
                  <div className="text-sm text-gray-500">Realni podaci iz pretrage</div>
                </div>

                {currentOffers.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500">Želite drugačije rezultate?</div>
                    <Button
                      onClick={() => setIsChatOpen(true)}
                      size="sm"
                      className="flex items-center bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                      <span className="mr-2">💬</span>
                      Podesi sa AI Chatom
                    </Button>
                  </div>
                )}
              </div>

              <SearchResults
                offers={currentOffers}
                isLoading={isLoading}
                onSaveOffer={handleSaveOffer}
              />
            </>
          )}

          {/* AI Chat Modal */}
          <AIChat
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            searchParams={searchResults?.searchParams || {}}
            currentOffers={currentOffers}
            currentFilters={currentFilters}
            onOffersUpdated={handleChatOffersUpdated}
          />

          {/* Instructions */}
          {!searchResults && !isLoading && (
            <div className="bg-white rounded-lg shadow p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                🚀 Kako radi Google Gemini AI pretraga?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="text-3xl mb-3">1.</div>
                  <h4 className="font-bold text-blue-800 mb-2">AI Analiza</h4>
                  <p className="text-gray-700">
                    Vaš zahtev se šalje Google Gemini AI modelu koji analizira sve parametre
                  </p>
                </div>

                <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="text-3xl mb-3">2.</div>
                  <h4 className="font-bold text-purple-800 mb-2">Generisanje Filtera</h4>
                  <p className="text-gray-700">
                    AI generiše optimalne filtere za pretragu u bazi podataka
                  </p>
                </div>

                <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="text-3xl mb-3">3.</div>
                  <h4 className="font-bold text-green-800 mb-2">Personalizovane Preporuke</h4>
                  <p className="text-gray-700">
                    Dobijate ponude sa AI objašnjenjem zašto su preporučene baš vama
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      </div>
    </div>
  )
}
