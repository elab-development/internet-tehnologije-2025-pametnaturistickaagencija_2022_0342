// lib/api/chat-api.ts
import { BackendOffer, SearchParams } from './ai-search'
import {
  initSocket,
  getSocket,
  sendChatMessage,
  onChatState,
  onChatResponseStart,
  onChatResponseChunk,
  onChatResponseDone,
  onChatError,
  removeAllListeners,
  SocketConfig,
} from '@/lib/socket-client'

export interface ChatRequest {
  message: string
  searchParams: any
  currentOffers: BackendOffer[]
  filters?: any
}

export interface ChatResponse {
  success: boolean
  aiMessage?: string
  updatedOffers?: BackendOffer[]
  newFilters?: any
  message?: string
  criteria?: Record<string, any>
  followUpQuestions?: string[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// Postojeće HTTP funkcije za chat management
export async function getChats(): Promise<any[]> {
  const response = await fetch(`${API_URL}/chats`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
  return response.json()
}

export async function createChat(chatName: string): Promise<any> {
  const response = await fetch(`${API_URL}/chats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ chatName }),
  })
  return response.json()
}

// Nova socket-based funkcija za SK4 scenarij
export function setupChatSocket(config: SocketConfig) {
  return initSocket(config)
}

export function subscribeToChatEvents({
  onState,
  onResponseStart,
  onResponseChunk,
  onResponseDone,
  onError,
}: {
  onState?: (state: any) => void
  onResponseStart?: (data: any) => void
  onResponseChunk?: (data: any) => void
  onResponseDone?: (data: any) => void
  onError?: (data: any) => void
}) {
  if (onState) onChatState(onState)
  if (onResponseStart) onChatResponseStart(onResponseStart)
  if (onResponseChunk) onChatResponseChunk(onResponseChunk)
  if (onResponseDone) onChatResponseDone(onResponseDone)
  if (onError) onChatError(onError)
}

export function sendSocketChatMessage(
  chatId: number,
  userId: number,
  message: string,
  searchParams: SearchParams,
  currentFilters: any,
  currentOffers: any[],
): void {
  sendChatMessage({
    chatId,
    userId,
    message,
    searchParams,
    currentFilters,
    currentOffers,
  })
}

export function cleanupSocket(): void {
  removeAllListeners()
  // Note: Ne disconnektujemo socket da bi ostao povezan za real-time
}
