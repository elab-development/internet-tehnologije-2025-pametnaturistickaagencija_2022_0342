'use client'

import { ChatMessage as ChatMessageType } from '@/lib/types/chat'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.senderType === 'AI'

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isAI
            ? 'bg-blue-50 border border-blue-100 text-gray-800 rounded-bl-none'
            : 'bg-blue-600 text-white rounded-br-none'
        }`}
      >
        {/* Sender info */}
        <div className="flex items-center mb-1">
          {isAI ? (
            <>
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mr-2">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              <span className="text-xs font-medium text-blue-700">SmartTurist AI</span>
            </>
          ) : (
            <span className="text-xs font-medium text-blue-100">Vi</span>
          )}
        </div>

        {/* Message text */}
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>

        {/* Timestamp */}
        <div className={`text-xs mt-2 ${isAI ? 'text-gray-500' : 'text-blue-200'}`}>
          {new Date(message.date).toLocaleTimeString('sr-RS', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        {/* AI indicator */}
        {isAI && message.flag && (
          <div className="mt-2 pt-2 border-t border-blue-100">
            <div className="flex items-center text-xs text-green-600">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              AI je ažurirao rezultate pretrage
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
