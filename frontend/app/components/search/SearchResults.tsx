'use client'

import { TravelOffer } from '@/lib/types/search'
import { Button } from '@/app/components/ui/Button'
import { useAuth } from '@/app/context/AuthContext'
import Image from 'next/image'

interface SearchResultsProps {
  offers: TravelOffer[]
  isLoading: boolean
  onSaveOffer?: (offer: TravelOffer) => void
}

export function SearchResults({ offers, isLoading, onSaveOffer }: SearchResultsProps) {
  const { user } = useAuth()

  const formatCurrency = (amount: number) => {
    return `€${amount.toLocaleString()}`
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      HOTEL: 'bg-blue-100 text-blue-800',
      FLIGHT: 'bg-green-100 text-green-800',
      PACKAGE: 'bg-purple-100 text-purple-800',
      OTHER: 'bg-gray-100 text-gray-800',
    }
    return colors[type] || colors.OTHER
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">AI pretraga u toku...</p>
      </div>
    )
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">😕</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Nema pronađenih ponuda</h3>
        <p className="text-gray-500">
          Pokušajte da proširite kriterijume pretrage ili promenite parametre
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">Pronađene ponude ({offers.length})</h3>
        <div className="text-sm text-gray-500">Sortirano po AI relevantnosti</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {offers.map(offer => (
          <div
            key={offer.id}
            className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <div className="relative h-48">
              {/* <Image
                src={offer.imageUrl}
                alt={offer.name}
                width="500"
                height="500"
                className="w-full h-full object-cover"
              /> */}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(offer.offerType)}`}
                >
                  {offer.offerType.toLowerCase()}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded">
                <span className="font-bold">{formatCurrency(offer.price)}</span>
                <span className="text-sm"> / osoba</span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{offer.name}</h4>
                  <p className="text-gray-600">{offer.location}</p>
                </div>
                <div className="flex items-center">
                  <span className="text-yellow-500">★</span>
                  <span className="ml-1 font-medium">{offer.rating}</span>
                </div>
              </div>

              <p className="text-gray-700 mb-4 line-clamp-2">{offer.description}</p>

              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <div className="flex items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">🤖 AI analiza:</span>
                </div>
                <p className="text-sm text-gray-600">{offer.aiExplanation}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center text-sm">
                  <svg
                    className="w-4 h-4 mr-2 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{offer.distance} km</span>
                </div>

                <div className="flex items-center text-sm">
                  <svg
                    className="w-4 h-4 mr-2 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{offer.transportation.join(', ')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-6">
                {offer.amenities.slice(0, 4).map((amenity, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    {amenity}
                  </span>
                ))}
                {offer.amenities.length > 4 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    +{offer.amenities.length - 4}
                  </span>
                )}
              </div>

              <div className="flex justify-between">
                <div className="space-x-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.open(Object.values(offer.siteLinks)[0], '_blank')}
                  >
                    Vidi ponudu
                  </Button>

                  {user && user.role !== 'GUEST' && onSaveOffer && (
                    <Button variant="outline" size="sm" onClick={() => onSaveOffer(offer)}>
                      Sačuvaj
                    </Button>
                  )}
                </div>

                <button
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={() => alert(`Detalji: ${offer.aiExplanation}`)}
                >
                  Više detalja
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
