'use client'

import { Button } from '@/app/components/ui/Button'
import { useAuth } from '@/app/context/AuthContext'
import type { BackendOffer, HotelOffer, FlightOffer } from '@/lib/api/ai-search'

interface SearchResultsProps {
  offers: BackendOffer[]
  isLoading: boolean
  destination?: string
  onSaveOffer?: (offer: BackendOffer) => void
}

export function SearchResults({
  offers,
  isLoading,
  destination = 'Budva',
  onSaveOffer,
}: SearchResultsProps) {
  const { user } = useAuth()

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return 'Cena na upit'
    return `${currency} ${amount.toLocaleString('sr-RS')}`
  }

  const safeHostname = (url?: string | null) => {
    if (!url) return null
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return null
    }
  }

  const getTransportIcon = (type: string) => {
    const icons: Record<string, string> = {
      flight: '✈️',
      bus: '🚌',
      car: '🚗',
      train: '🚂',
      unknown: '🚕',
    }
    return icons[type] || '🚕'
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hotel: 'Hotel',
      apartment: 'Apartman',
      hostel: 'Hostel',
      resort: 'Resort',
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      hotel: 'bg-blue-100 text-blue-800',
      apartment: 'bg-green-100 text-green-800',
      hostel: 'bg-yellow-100 text-yellow-800',
      resort: 'bg-purple-100 text-purple-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const renderStars = (stars: number | null | undefined) => {
    if (!stars) return null
    const s = Math.max(0, Math.min(5, Math.round(stars)))
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map(
          (_, i) =>
            i < s && (
              <span key={i} className={`text-sm text-yellow-500`}>
                ★
              </span>
            ),
        )}
      </div>
    )
  }

  // ✅ type guards
  const isHotelOffer = (offer: BackendOffer): offer is HotelOffer => offer.accommodation !== null
  const isFlightOffer = (offer: BackendOffer): offer is FlightOffer =>
    offer.accommodation === null && offer.transport.type === 'flight'

  const formatDurationMinutes = (val: string | null) => {
    if (!val) return null
    const s = String(val).trim()
    const n = Number(s)
    if (!Number.isFinite(n)) return s
    const mins = Math.max(0, Math.round(n))
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m} min`
    if (m === 0) return `${h} h`
    return `${h} h ${m} min`
  }

  const renderHotelCard = (offer: HotelOffer, index: number) => {
    const srcLink = offer.source?.link
    const hostname = safeHostname(srcLink)

    const acc = offer.accommodation
    const price = offer.price
    const transport = offer.transport

    const thumbnail = offer.media?.thumbnail ?? null

    return (
      <div
        key={index}
        className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
      >
        {thumbnail ? (
          <div className="w-full h-44 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt={acc.name}
              className="w-full h-44 object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="p-6">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(acc.type)}`}>
                  {getTypeLabel(acc.type)}
                </span>
                {renderStars(acc.stars)}
                {acc.deal ? (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {acc.deal}
                  </span>
                ) : null}
              </div>

              <h4 className="text-lg font-bold text-gray-900 mb-1 truncate">{acc.name}</h4>

              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {acc.rating != null && (
                  <div className="flex items-center">
                    {/* <span className="text-yellow-500 mr-1">★</span> */}
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-sm ${i + 1 < acc.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                    <span>{acc.rating}</span>
                    {acc.reviews_count != null && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({acc.reviews_count} recenzija)
                      </span>
                    )}
                  </div>
                )}

                {acc.distance_from_center_km != null && (
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-1 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{acc.distance_from_center_km} km od centra</span>
                  </div>
                )}

                {(acc.check_in_time || acc.check_out_time) && (
                  <div className="flex items-center">
                    <span className="mr-1">🕒</span>
                    <span className="text-gray-600">
                      {acc.check_in_time ? `CI ${acc.check_in_time}` : 'CI —'}
                      <span className="mx-1">•</span>
                      {acc.check_out_time ? `CO ${acc.check_out_time}` : 'CO —'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(price.total ?? null, price.currency ?? 'EUR')}
              </div>
              <div className="text-xs text-gray-500">
                {price.per_night &&
                  `Po noći: ${formatCurrency(price.per_night, price.currency ?? 'EUR')}`}
              </div>

              {price.before_taxes_fees != null && (
                <div className="text-xs text-gray-500">
                  Pre taksi: {formatCurrency(price.before_taxes_fees, price.currency ?? 'EUR')}
                </div>
              )}
            </div>
          </div>

          {offer.ai_explanation && (
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4">
              <div className="flex items-center mb-1">
                <span className="text-sm font-medium text-blue-700">🤖 AI analiza:</span>
              </div>
              <p className="text-sm text-blue-800">{offer.ai_explanation}</p>
            </div>
          )}

          <div className="space-y-2 mb-4">
            {transport.type !== 'unknown' && (
              <div className="flex items-center text-sm">
                <span className="mr-2">{getTransportIcon(transport.type)}</span>
                <span className="text-gray-700">
                  Prevoz: {transport.type}
                  {transport.estimated_duration ? ` (${transport.estimated_duration})` : ''}
                </span>
              </div>
            )}
          </div>

          {acc.amenities?.length ? (
            <div className="flex flex-wrap gap-1 mb-6">
              {acc.amenities.slice(0, 8).map((amenity, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {amenity}
                </span>
              ))}
            </div>
          ) : (
            <div className="mb-6" />
          )}

          <div className="flex justify-between items-center">
            <div className="space-x-2">
              {srcLink && (
                <Button variant="primary" size="sm" onClick={() => window.open(srcLink, '_blank')}>
                  Više o hotelu
                </Button>
              )}

              {user && user.role !== 'GUEST' && onSaveOffer && (
                <Button variant="outline" size="sm" onClick={() => onSaveOffer(offer)}>
                  Sačuvaj
                </Button>
              )}
            </div>

            {hostname && <div className="text-xs text-gray-500">Izvor: {hostname}</div>}
          </div>
        </div>
      </div>
    )
  }

  const renderFlightCard = (offer: FlightOffer, index: number) => {
    const t = offer.transport
    const p = offer.price
    const srcLink = offer.source?.link
    const hostname = safeHostname(srcLink)

    const airline = t.airline || 'Aviokompanija'
    const airlineLogo = t.airline_logo || undefined
    const durationPretty = formatDurationMinutes(t.estimated_duration)

    return (
      <div
        key={index}
        className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">✈️</div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Let</div>

                <div className="flex items-center gap-2">
                  {airlineLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={airlineLogo}
                      alt={airline}
                      className="w-7 h-7 rounded bg-white border border-gray-200 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-gray-100 border border-gray-200" />
                  )}

                  <h4 className="text-lg font-bold text-gray-900">{airline}</h4>
                </div>

                <div className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">{t.from}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium">{t.to}</span>
                  {durationPretty ? (
                    <span className="ml-2 text-gray-500">• {durationPretty}</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(p.total ?? null, p.currency ?? 'EUR')}
              </div>
              <div className="text-xs text-gray-500">{p.per_person ? 'po osobi' : 'ukupno'}</div>
            </div>
          </div>

          <div className="space-y-2 mb-6 text-sm text-gray-700">
            <div className="flex items-center">
              <span className="mr-2">{getTransportIcon('flight')}</span>
              <span>
                Ruta: {t.from} → {t.to}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="space-x-2">
              {srcLink && (
                <Button variant="primary" size="sm" onClick={() => window.open(srcLink, '_blank')}>
                  Vidi detalje
                </Button>
              )}

              {user && user.role !== 'GUEST' && onSaveOffer && (
                <Button variant="outline" size="sm" onClick={() => onSaveOffer(offer)}>
                  Sačuvaj
                </Button>
              )}
            </div>

            {hostname && <div className="text-xs text-gray-500">Izvor: {hostname}</div>}
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Pretraga u toku...</p>
      </div>
    )
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">😕</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Nema pronađenih ponuda</h3>
        <p className="text-gray-500">
          Nismo pronašli ponude za {destination}. Pokušajte sa drugim parametrima.
        </p>
      </div>
    )
  }

  const sortedOffers = [...offers].sort(
    (a, b) => (isHotelOffer(a) ? 0 : 1) - (isHotelOffer(b) ? 0 : 1),
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedOffers.map((offer, index) => {
          if (isFlightOffer(offer)) return renderFlightCard(offer, index)
          if (isHotelOffer(offer)) return renderHotelCard(offer, index)

          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 p-6"
            >
              <div className="text-sm text-gray-600">Nepoznat tip ponude.</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
