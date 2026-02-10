export type SenderType = 'USER' | 'AI'

export interface ChatMessage {
  id: number
  chatId: number
  senderType: SenderType
  text: string
  date: string
  flag?: boolean
}

export interface Chat {
  id: number
  userId: number
  chatName: string
  createdAt: string
  messages: ChatMessage[]
}

export interface ChatRequest {
  message: string
  searchParams: any
  currentOffers: any[]
  filters?: any
}

export interface ChatResponse {
  success: boolean
  message?: string
  updatedOffers: any[]
  aiMessage: string
  newFilters?: {
    priceRange?: [number, number]
    locationKeywords?: string[]
    mustHave?: string[]
    amenities?: string[]
  }
  chatMessage?: ChatMessage
}

export interface ChatState {
  isOpen: boolean
  isLoading: boolean
  messages: ChatMessage[]
  currentChatId?: number
  inputText: string
}
