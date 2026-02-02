import { SearchParams, AIResponse, TravelOffer } from '@/lib/types/search'
import Photo from '@/public/tour-photo.jpg'

const mockOffers: TravelOffer[] = [
  {
    id: 1,
    name: 'Hotel Plaza, Budva',
    date: new Date(),
    description: 'Luksuzni hotel sa pogledom na more, all inclusive',
    price: 450,
    offerType: 'HOTEL',
    location: 'Budva, Crna Gora',
    distance: 250,
    transportation: ['avion', 'autobus', 'transfer'],
    amenities: ['bazen', 'spa', 'restoran', 'wifi'],
    rating: 4.7,
    imageUrl: `${Photo}`,
    siteLinks: { booking: 'https://booking.com/plaza', agencija: 'https://pta.com/1' },
    aiExplanation:
      'Preporučujem ovaj hotel zbog odličnog odnosa cene i kvaliteta. All inclusive paket uključuje sve obroke i pića.',
  },
  {
    id: 2,
    name: 'Avionska karta Beograd-Solun',
    date: new Date(),
    description: 'Direktan let, prtljag uključen',
    price: 180,
    offerType: 'FLIGHT',
    location: 'Solun, Grčka',
    distance: 380,
    transportation: ['avion'],
    amenities: ['prtljag', 'obrok', 'wifi'],
    rating: 4.3,
    imageUrl: `${Photo}`,
    siteLinks: { airSerbia: 'https://airserbia.com', wizzair: 'https://wizzair.com' },
    aiExplanation:
      'Najjeftinija opcija za vaš termin. Direktan let ujutru, idealno za vikend putovanje.',
  },
  {
    id: 3,
    name: 'Paket aranžman Hrvatska',
    date: new Date(),
    description: '7 noćenja + polupansion + izleti',
    price: 650,
    offerType: 'PACKAGE',
    location: 'Dubrovnik, Hrvatska',
    distance: 320,
    transportation: ['autobus', 'transfer'],
    amenities: ['plaza', 'restoran', 'izleti', 'animacija'],
    rating: 4.8,
    imageUrl: `${Photo}`,
    siteLinks: { arrange: 'https://arrange.com/hr', pta: 'https://pta.com/package' },
    aiExplanation: 'Kompletan paket za porodicu. Uključuje sve transferе i 3 organizovana izleta.',
  },
  {
    id: 4,
    name: 'Vikend u Sofiji',
    date: new Date(),
    description: 'City break sa turističkim vodičem',
    price: 290,
    offerType: 'PACKAGE',
    location: 'Sofija, Bugarska',
    distance: 400,
    transportation: ['autobus', 'gradski prevoz'],
    amenities: ['vodič', 'muzeji', 'hrana'],
    rating: 4.5,
    imageUrl: `${Photo}`,
    siteLinks: { citybreak: 'https://citybreak.com/bg', pta: 'https://pta.com/sofija' },
    aiExplanation: 'Kulturno bogata destinacija sa niskim troškovima. Idealno za kratak odmor.',
  },
  {
    id: 5,
    name: 'Hotel Montenegro Beach',
    date: new Date(),
    description: 'First line, plaža 50m od hotela',
    price: 520,
    offerType: 'HOTEL',
    location: 'Petrovac, Crna Gora',
    distance: 280,
    transportation: ['avion', 'transfer'],
    amenities: ['plaza', 'bazen', 'spa', 'fitness'],
    rating: 4.9,
    imageUrl: `${Photo}`,
    siteLinks: { hotels: 'https://hotels.com/montenegro', pta: 'https://pta.com/beach' },
    aiExplanation: 'Ekskluzivna lokacija za parove. Romantic ambijent i privatna plaža.',
  },
]

export async function searchTravelOffers(params: SearchParams): Promise<AIResponse> {
  console.log('🤖 AI servis prima zahtev:', params)

  await new Promise(resolve => setTimeout(resolve, 1500))

  if (!params.startDate || !params.endDate || !params.destination || !params.passengers) {
    return {
      success: false,
      message: 'Molimo popunite sva obavezna polja.',
      offers: [],
      explanation: '',
      filters: { priceRange: [0, 0], locationPriority: [], mustHave: [] },
    }
  }

  const aiFilters = {
    priceRange: [params.budget * 0.7, params.budget * 1.3] as [number, number],
    locationPriority: [params.destination.toLowerCase()],
    mustHave: params.passengers > 2 ? ['family-friendly'] : ['romantic'],
  }

  const filteredOffers = mockOffers.filter(offer => {
    const inPriceRange =
      offer.price >= aiFilters.priceRange[0] && offer.price <= aiFilters.priceRange[1]

    const matchesDestination = offer.location
      .toLowerCase()
      .includes(params.destination.toLowerCase())

    const suitableForPassengers =
      params.passengers <= 2 || offer.amenities.includes('family-friendly')

    return (
      inPriceRange && (matchesDestination || params.destination === '') && suitableForPassengers
    )
  })

  const explanation = generateAIExplanation(params, filteredOffers.length)

  const shouldFail = Math.random() < 0.1
  if (shouldFail) {
    return {
      success: false,
      message: 'Trenutno nije moguće obraditi zahtev.',
      offers: [],
      explanation: '',
      filters: aiFilters,
    }
  }

  const isServiceDown = Math.random() < 0.05
  if (isServiceDown) {
    return {
      success: false,
      message: 'Pretraga privremeno nije dostupna.',
      offers: [],
      explanation: '',
      filters: aiFilters,
    }
  }

  return {
    success: true,
    offers: filteredOffers,
    explanation,
    filters: aiFilters,
  }
}

function generateAIExplanation(params: SearchParams, offerCount: number): string {
  const explanations = [
    `Na osnovu vaših kriterijuma (budžet: €${params.budget}, ${params.passengers} putnika), pronašao sam ${offerCount} odgovarajućih ponuda. Preporučujem opcije sa najboljim odnosom cene i kvaliteta.`,
    `AI analiza je identifikovala ${offerCount} ponuda koje odgovaraju vašim potrebama. Fokusirao sam se na destinacije sa dobrim transportnim vezama i visokim ocenama korisnika.`,
    `Za ${params.passengers} putnika u periodu ${params.startDate} - ${params.endDate}, sistem je pronašao ${offerCount} optimizovanih ponuda. Preporuka: izbegavajte vrhunac sezone za bolje cene.`,
    `Generisane ponude uzimaju u obzir vaš budžet i preferencije. ${offerCount > 0 ? 'Najbolja opcija je prva na listi.' : 'Probajte da proširite kriterijume pretrage.'}`,
  ]

  return explanations[Math.floor(Math.random() * explanations.length)]
}
