'use client'

import React from 'react'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  onClose?: () => void
  autoClose?: number // milliseconds
}

export function Alert({ type, message, onClose, autoClose }: AlertProps) {
  const styles = {
    success: 'bg-green-50 border-green-400 text-green-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800',
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }

  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, autoClose)
      return () => clearTimeout(timer)
    }
  }, [autoClose, onClose])

  return (
    <div className={`mb-4 p-4 border rounded-md ${styles[type]}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <span className="mr-2">{icons[type]}</span>
          <span>{message}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700">
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
