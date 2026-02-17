export interface SearchParams {
  startDate: string
  endDate: string
  budget: number
  destination: string
  passengers: number
  preferences?: string[]
}

export interface TravelOffer {
  id: number
  name: string
  description: string
  price: number
  type: 'HOTEL' | 'FLIGHT' | 'PACKAGE' | 'OTHER'
  location: string
  distance: number
  transportation: string[]
  amenities: string[]
  rating: number
  imageUrl: string
  siteLinks: Record<string, string>
  aiExplanation: string
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
