// lib/socket-client.ts
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001'

let socket: Socket | null = null

export interface ChatState {
  chatId: number
  criteria: Record<string, any>
  messages: Array<{
    id: number
    role: 'user' | 'assistant'
    text: string
    ts: number
  }>
}

export interface SocketConfig {
  token?: string
  chatId?: number
  userId?: number
}

export function initSocket(config: SocketConfig = {}): Promise<Socket> {
  return new Promise((resolve, reject) => {
    if (socket?.connected) {
      resolve(socket)
      return
    }

    socket = io(SOCKET_URL, {
      auth: {
        token: config.token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id)

      // Join chat if chatId is provided
      if (config.chatId && config.userId) {
        socket?.emit('chat_join', {
          chatId: config.chatId,
          userId: config.userId,
        })
      }

      resolve(socket!)
    })

    socket.on('connect_error', error => {
      console.error('Socket connection error:', error)
      reject(error)
    })

    socket.on('disconnect', reason => {
      console.log('Socket disconnected:', reason)
    })
  })
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Event handlers
export function onChatState(callback: (state: ChatState) => void) {
  socket?.on('chat_state', callback)
}

export function onChatResponseStart(callback: (data: { chatId: number }) => void) {
  socket?.on('chat_response_start', callback)
}

export function onChatResponseChunk(callback: (data: { chatId: number; delta: string }) => void) {
  socket?.on('chat_response_chunk', callback)
}

export function onChatResponseDone(
  callback: (data: {
    chatId: number
    reply: string
    updatedSearchParams?: any
    updatedFilters?: any
    updatedOffers?: any[]
    criteria_update?: Record<string, any>
    filters_update?: Record<string, any>
    follow_up_questions?: string[]
  }) => void,
) {
  socket?.on('chat_response_done', callback)
}

export function onChatError(callback: (data: { message: string }) => void) {
  socket?.on('chat_error', callback)
}

export function sendChatMessage(payload: {
  chatId: number
  userId: number
  message: string
  searchParams: any
  currentFilters?: any
  currentOffers?: any[]
}): void {
  socket?.emit('chat_message', payload)
}
export function removeAllListeners(): void {
  socket?.removeAllListeners()
}
