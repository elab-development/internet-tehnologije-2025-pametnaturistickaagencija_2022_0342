'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ChatSidebar } from './ChatSidebar'
import { Alert } from '@/app/components/ui/Alert'
import {
  getChats,
  createChat,
  setupChatSocket,
  subscribeToChatEvents,
  sendSocketChatMessage,
  cleanupSocket,
} from '@/lib/api/chat-api'
import { ChatMessage as ChatMessageType, Chat } from '@/lib/types/chat'
import { useAuth } from '@/app/context/AuthContext'
import { searchTravelOffers, SearchParams } from '@/lib/api/ai-search'

interface AIChatProps {
  isOpen: boolean
  onClose: () => void
  searchParams: SearchParams
  currentOffers: any[]
  currentFilters?: any
  onOffersUpdated: (offers: any[], filters?: any, criteria?: any) => void
}

// ✅ Mapira backend/AI criteria (from/to/interests/...) -> tvoj SearchParams (startDate/endDate/preferences/...)
function criteriaToSearchParams(base: SearchParams, criteria: Record<string, any>): SearchParams {
  const next: SearchParams = { ...base }

  if (typeof criteria.destination === 'string' && criteria.destination.trim()) {
    next.destination = criteria.destination.trim()
  }

  // AI/backend: from/to  -> frontend: startDate/endDate
  if (typeof criteria.from === 'string' && criteria.from.trim())
    next.startDate = criteria.from.trim()
  if (typeof criteria.to === 'string' && criteria.to.trim()) next.endDate = criteria.to.trim()

  // Budžet (nekad AI šalje budget_eur)
  if (typeof criteria.budget === 'number') next.budget = criteria.budget
  if (typeof criteria.budget_eur === 'number') next.budget = criteria.budget_eur

  // Interests -> preferences
  const interests = criteria.interests
  if (Array.isArray(interests)) {
    next.preferences = interests
      .map(String)
      .map(s => s.trim())
      .filter(Boolean)
  } else if (typeof interests === 'string' && interests.trim()) {
    next.preferences = interests
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }

  // Ako AI šalje passengers
  if (typeof criteria.passengers === 'number') next.passengers = criteria.passengers

  return next
}

export function AIChat({
  isOpen,
  onClose,
  searchParams,
  currentOffers,
  currentFilters,
  onOffersUpdated,
}: AIChatProps) {
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<number>()
  const [error, setError] = useState<string>('')
  const [info, setInfo] = useState<string>('') // ✅ status bez dodavanja poruke u chat
  const [showSidebar, setShowSidebar] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const [currentCriteria, setCurrentCriteria] = useState<Record<string, any>>({})
  const [aiResponse, setAiResponse] = useState<string>('')

  // ✅ aktivni parametri pretrage (da ne koristiš zauvek “stari” prop)
  const [activeSearchParams, setActiveSearchParams] = useState<SearchParams>(searchParams)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscribedForChatIdRef = useRef<number | null>(null)

  useEffect(() => {
    setActiveSearchParams(searchParams)
  }, [searchParams])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Auto-scroll
  useEffect(() => {
    scrollToBottom()
  }, [messages, aiResponse, scrollToBottom])

  // Init chat list once on open
  useEffect(() => {
    if (isOpen && user && user.role !== 'GUEST' && !isInitialized) {
      initializeChat()
      setIsInitialized(true)
    }

    return () => {
      if (!isOpen) {
        cleanupSocket()
        setIsSocketConnected(false)
        subscribedForChatIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user])

  // Setup socket when chat changes
  useEffect(() => {
    if (currentChatId && user?.id && isOpen) {
      setupSocketConnection(currentChatId, user.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId, user?.id, isOpen])

  const initializeChat = async () => {
    try {
      const userChats = await getChats()
      setChats(userChats)

      if (userChats.length > 0) {
        setCurrentChatId(userChats[0].id)
      } else {
        await handleCreateNewChat()
      }
    } catch (e) {
      console.error('Failed to load chats:', e)
      await handleCreateNewChat()
    }
  }

  const setupSocketConnection = async (chatId: number, userId: number) => {
    // ✅ spreči duplo subscribe-ovanje za isti chat (inače dobiješ duple evente/poruke)
    if (subscribedForChatIdRef.current === chatId) return

    try {
      // ✅ očisti stare listenere pre ponovnog subscribe-a
      cleanupSocket()
      setIsSocketConnected(false)
      setError('')
      setInfo('')

      await setupChatSocket({
        token: localStorage.getItem('token') || undefined,
        chatId,
        userId,
      })

      setIsSocketConnected(true)
      subscribedForChatIdRef.current = chatId

      subscribeToChatEvents({
        onState: state => {
          console.log('Chat state received:', state)
          setCurrentCriteria(state.criteria || {})

          const chatMessages = (state.messages || []).map((msg: any, index: number) => ({
            id: index + 1,
            chatId,
            senderType: msg.role === 'user' ? 'USER' : 'AI',
            text: msg.text,
            date: new Date(msg.ts).toISOString(),
          }))

          setMessages(chatMessages)
        },

        onResponseStart: () => {
          setIsLoading(true)
          setAiResponse('')
        },

        onResponseChunk: data => {
          setAiResponse(prev => prev + (data.delta || ''))
        },

        onResponseDone: async data => {
          console.log('AI response done:', data)
          console.log('CRITERIA UPDATE:', data.criteria_update)
          console.log('CRITERIA MERGED:', data.criteria)

          // ✅ add AI reply (samo jednom)
          setMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              chatId,
              senderType: 'AI',
              text: data.reply,
              date: new Date().toISOString(),
            },
          ])

          setAiResponse('')
          setIsLoading(false)

          if (Array.isArray(data.updatedOffers)) {
            onOffersUpdated(data.updatedOffers, data.updatedFilters, data.updatedSearchParams)
          }
        },

        onError: data => {
          console.error('Chat error:', data)
          setError(data.message || 'Došlo je do greške u chat-u')
          setIsLoading(false)
          setAiResponse('')
        },
      })
    } catch (err) {
      console.error('Socket connection failed:', err)
      setError('Veza sa AI servisom nije uspostavljena')
      setIsSocketConnected(false)
      subscribedForChatIdRef.current = null
    }
  }

  const refreshSearchResults = async (criteria: Record<string, any>) => {
    try {
      setError('')
      setInfo('')

      // ✅ mapiranje criteria -> SearchParams
      const updated = criteriaToSearchParams(activeSearchParams, criteria)

      console.log('REFRESH CRITERIA:', criteria)
      console.log('FINAL updatedSearchParams:', updated)

      setActiveSearchParams(updated)

      const response = await searchTravelOffers(updated)

      if (response.success && response.offers.length > 0) {
        onOffersUpdated(response.offers, response.aiAnalysis.filters, criteria)
        setInfo(`✅ Ažurirana pretraga: ${response.offers.length} ponuda.`)
      } else {
        setError('Nema ponuda koje odgovaraju vašim novim kriterijumima.')
      }
    } catch (e) {
      console.error('Failed to refresh search:', e)
      setError('Došlo je do greške pri osvežavanju pretrage')
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!user || user.role === 'GUEST') {
      setError('Morate biti prijavljeni da biste koristili AI chat')
      return
    }
    if (!currentChatId) {
      setError('Chat nije inicijalizovan')
      return
    }
    if (!isSocketConnected) {
      setError('Veza sa AI servisom nije uspostavljena')
      return
    }

    setError('')
    setInfo('')

    // ✅ add user message
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        chatId: currentChatId,
        senderType: 'USER',
        text: message,
        date: new Date().toISOString(),
      },
    ])

    try {
      sendSocketChatMessage(
        currentChatId,
        user.id,
        message,
        searchParams, // ✅ trenutni searchParams
        currentFilters || {}, // ✅ UI filteri
        currentOffers || [], // ✅ trenutne ponude
      )
    } catch (e) {
      console.error('Failed to send message:', e)
      setError('Došlo je do greške pri slanju poruke')
    }
  }

  const handleCreateNewChat = async () => {
    try {
      const newChatName = `Putovanje ${searchParams.destination} ${new Date().toLocaleDateString()}`
      const newChat = await createChat(newChatName)

      setChats(prev => [newChat, ...prev])
      setCurrentChatId(newChat.id)
      setMessages([])
      setCurrentCriteria({})
      setAiResponse('')
      setInfo('')
      setError('')

      // reset subscribe marker (da se ponovo subscribe uradi za novi chat)
      subscribedForChatIdRef.current = null
    } catch (e) {
      console.error('Failed to create chat:', e)
      setError('Neuspelo kreiranje novog razgovora')
    }
  }

  const currentChat = chats.find(chat => chat.id === currentChatId)
  const chatTitle = currentChat?.chatName || `Chat ${currentChatId}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-50 transition-opacity" onClick={onClose} />

      {/* Chat container */}
      <div className="absolute inset-y-0 right-0 flex max-w-full">
        {/* Sidebar */}
        {showSidebar && (
          <div className="relative flex-shrink-0">
            <ChatSidebar
              chats={chats}
              currentChatId={currentChatId}
              onSelectChat={id => {
                setCurrentChatId(id)
                setShowSidebar(false)
                setMessages([])
                setAiResponse('')
                setInfo('')
                setError('')
                subscribedForChatIdRef.current = null
              }}
              onCreateNewChat={handleCreateNewChat}
              onClose={() => setShowSidebar(false)}
            />
          </div>
        )}

        {/* Main chat panel */}
        <div className="relative flex-1 flex flex-col w-screen max-w-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="mr-4 p-2 hover:bg-white rounded-lg"
                >
                  <span className="text-xl">💬</span>
                </button>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-gray-800">🤖 AI Chat</h2>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isSocketConnected ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-xs text-gray-500">
                        {isSocketConnected ? 'Povezan' : 'Nije povezan'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {chatTitle} • Fino podesite pretragu razgovorom
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCreateNewChat}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Novi razgovor
                </button>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>
          </div>

          {/* Connection status */}
          {!isSocketConnected && (
            <div className="px-6 pt-4">
              <Alert
                type="warning"
                message="Veza sa AI servisom nije uspostavljena. Chat funkcionalnost je ograničena."
              />
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div className="px-6 pt-4">
              <Alert
                type={error.includes('AI servis') ? 'warning' : 'error'}
                message={error}
                onClose={() => setError('')}
              />
            </div>
          )}

          {/* Info alert */}
          {info && (
            <div className="px-6 pt-4">
              <Alert type="success" message={info} onClose={() => setInfo('')} />
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🤖</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Google Gemini AI Asistent
                  </h3>
                  <p className="text-gray-500">
                    Unesite dodatne zahteve da AI fino podesi vašu pretragu
                  </p>
                  <div className="mt-6 text-sm text-gray-400">
                    <p>Trenutna pretraga: {activeSearchParams.destination}</p>
                    <p>Budžet: €{activeSearchParams.budget}</p>
                    <p>Putnici: {activeSearchParams.passengers}</p>
                    <p>
                      Datumi: {activeSearchParams.startDate} — {activeSearchParams.endDate}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <ChatMessage key={message.id} message={message} />
                  ))}

                  {/* Streaming AI response */}
                  {aiResponse && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">AI</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-blue-800 mb-1">Google Gemini AI</div>
                          <div className="text-gray-800 whitespace-pre-wrap">{aiResponse}</div>
                          {isLoading && (
                            <div className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-1 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Chat input */}
          <div className="border-t border-gray-200 p-4">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading || !isSocketConnected}
              placeholder={`Unesite dodatni zahtev za fino podešavanje ${activeSearchParams.destination}...`}
              disabled={!isSocketConnected}
            />
            <div className="mt-2 text-xs text-gray-500 text-center">
              {!isSocketConnected
                ? 'Čekanje na povezivanje sa AI servisom...'
                : 'AI će fino podesiti vašu pretragu na osnovu razgovora'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
