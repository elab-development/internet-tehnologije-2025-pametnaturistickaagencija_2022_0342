const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export interface SearchParams {
  startDate: string
  endDate: string
  budget: number
  destination: string
  passengers: number
  preferences?: string[]
}

/** zajedničko za sve ponude */
export type OfferSource = { link: string } | null

export interface Price {
  total: number | null
  currency: string
  per_night: number | null
}

export interface TransportBase {
  type: 'unknown' | 'flight' | 'bus' | 'car' | 'train'
  from: string | null
  to: string
  estimated_duration: string | null
}

/** Hotel */
export interface Accommodation {
  name: string
  type: 'hotel' | 'apartment' | 'hostel' | 'resort' | string
  stars: number | null
  rating: number | null
  distance_from_center_km: number | null
}

export interface HotelOffer {
  accommodation: Accommodation
  price: Price
  transport: TransportBase // kod hotela je uglavnom unknown
  availability: any
  source: OfferSource
  ai_explanation: string | null
}

/** Flight */
export interface FlightTransport extends TransportBase {
  type: 'flight'
  airline?: string | null
  airline_logo?: string | null
}

export interface FlightOffer {
  accommodation: null
  price: Price
  transport: FlightTransport
  availability: any
  source: OfferSource
  ai_explanation: string | null
}

/** Union */
export type BackendOffer = HotelOffer | FlightOffer

export interface BackendResponse {
  destination: string
  offers: BackendOffer[]
}

export interface AIResponse {
  success: boolean
  message?: string
  offers: BackendOffer[]
  aiAnalysis: {
    explanation: string
    filters: {
      priceRange: [number, number]
      locationKeywords: string[]
      mustHaveAmenities: string[]
      travelType: string[]
    }
    analysis: string
  }
  searchParams: SearchParams
  aiServiceAvailable: boolean
}

export async function searchTravelOffers(params: SearchParams): Promise<AIResponse> {
  try {
    const queryParams = new URLSearchParams({
      destination: params.destination,
      from: params.startDate,
      to: params.endDate,
      budget: params.budget.toString(),
      adults: params.passengers.toString(),
      lang: 'sr',
      ...(params.preferences?.length ? { interests: params.preferences.join(',') } : {}),
    })

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const response = await fetch(`${API_URL}/travel/search?${queryParams}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Greška u pretrazi' }))
      throw new Error(errorData.message || 'Greška u pretrazi')
    }

    const backendData = (await response.json()) as BackendResponse

    return {
      success: true,
      offers: backendData.offers ?? [],
      aiAnalysis: {
        explanation: `Pronađeno ${(backendData.offers ?? []).length} ponuda za ${backendData.destination}`,
        filters: {
          priceRange: [params.budget * 0.8, params.budget * 1.3],
          locationKeywords: [backendData.destination],
          mustHaveAmenities: params.preferences || [],
          travelType: [],
        },
        analysis: 'Rezultati su dobijeni iz realne pretrage (backend).',
      },
      searchParams: params,
      aiServiceAvailable: true,
    }
  } catch (error: any) {
    console.error('Greška u pretrazi:', error)

    return {
      success: false,
      message: error?.message || 'Došlo je do greške pri pretrazi',
      offers: [],
      aiAnalysis: {
        explanation: 'Pretraga nije uspela.',
        filters: {
          priceRange: [0, 0],
          locationKeywords: [],
          mustHaveAmenities: [],
          travelType: [],
        },
        analysis: 'Servis za pretragu trenutno nije dostupan.',
      },
      searchParams: params,
      aiServiceAvailable: false,
    }
  }
}
