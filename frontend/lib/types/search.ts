export interface SearchParams {
  startDate: string
  endDate: string
  budget: number
  destination: string
  passengers: number
  preferences?: string[]
}

// U lib/types/search.ts ili gde god imate interfejse
export interface TravelOffer {
  id?: number
  name: string
  description?: string
  price: number
  offerType: 'HOTEL' | 'FLIGHT' | 'PACKAGE' | 'OTHER'
  location: string
  distance?: number
  transportation: string[]
  amenities: string[]
  rating: number
  imageUrl: string
  siteLinks: Record<string, string>
  aiExplanation?: string
  // Dodajte ova polja ako ih koristite iz backend-a
  accommodation?: {
    name: string
    type: string
    stars?: number | null
    rating: number
    distance_from_center_km?: number | null
  }
  source?: {
    link: string
  }
}

export interface AIResponse {
  success: boolean
  message?: string
  offers: TravelOffer[]
  explanation: string
  filters: {
    priceRange: [number, number]
    locationPriority: string[]
    mustHave: string[]
  }
}
