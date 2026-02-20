'use client'

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/app/components/ui/Button'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
  placeholder?: string
}

export function ChatInput({ onSendMessage, isLoading, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const quickSuggestions = [
    'Prikaži jeftinije opcije',
    'Pronađi sa boljim ocenama',
    'Fokusiraj se na ponude sa bazenom',
    'Dodaj i luksuzne varijante',
    'Pronađi bliže destinacije',
  ]

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      {/* Quick suggestions */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-2">Brzi predlozi:</div>
        <div className="flex flex-wrap gap-2">
          {quickSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSendMessage(suggestion)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder || 'Unesite vaš dodatni zahtev AI asistentu...'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            Enter za slanje • Shift+Enter za novi red
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading}
          className="px-6 py-3 rounded-xl"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⟳</span>
              AI razmišlja...
            </>
          ) : (
            <>
              <span className="mr-2">✈️</span>
              Pošalji
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
