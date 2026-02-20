'use client'

import { useState } from 'react'
import { Chat } from '@/lib/types/chat'
import { Button } from '@/app/components/ui/Button'

interface ChatSidebarProps {
  chats: Chat[]
  currentChatId?: number
  onSelectChat: (chatId: number) => void
  onCreateNewChat: () => void
  onClose: () => void
}

export function ChatSidebar({
  chats,
  currentChatId,
  onSelectChat,
  onCreateNewChat,
  onClose,
}: ChatSidebarProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newChatName, setNewChatName] = useState('')

  const handleCreateChat = () => {
    if (newChatName.trim()) {
      // Ovdje bi bio API poziv za kreiranje novog chata
      onCreateNewChat()
      setNewChatName('')
      setIsCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('sr-RS', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div className="w-64 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">AI Razgovori</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <Button onClick={() => setIsCreating(true)} className="w-full mb-4">
          + Novi razgovor
        </Button>
      </div>

      {/* Create new chat form */}
      {isCreating && (
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            value={newChatName}
            onChange={e => setNewChatName(e.target.value)}
            placeholder="Naziv razgovora"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={handleCreateChat} size="sm" className="flex-1">
              Kreiraj
            </Button>
            <Button onClick={() => setIsCreating(false)} variant="outline" size="sm">
              Otkaži
            </Button>
          </div>
        </div>
      )}

      {/* Chats list */}
      <div className="flex-1 overflow-y-auto p-2">
        {chats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p>Nemate sačuvanih razgovora</p>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  currentChatId === chat.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium text-gray-800 truncate">{chat.chatName}</div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(chat.createdAt)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {chat.messages?.length || 0} poruka
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div className="flex items-center mb-1">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            AI dostupan za fino podešavanje
          </div>
          <p>Sve poruke su sejvovane u vašoj istoriji</p>
        </div>
      </div>
    </div>
  )
}
