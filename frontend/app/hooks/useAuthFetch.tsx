'use client'

import { useAuth } from '@/app/context/AuthContext'

export function useAuthFetch() {
  const { token } = useAuth()

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      console.warn('Token je istekao ili nije validan')
    }

    return response
  }

  return { authFetch }
}
