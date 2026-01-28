import { UserRole } from '@/app/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface RequestOptions extends RequestInit {
  token?: string
}

export async function fetchAPI(endpoint: string, options: RequestOptions = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const url = `${API_URL}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Došlo je do greške')
  }

  return data
}

export const authAPI = {
  login: (email: string, password: string) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (userData: UserRole) =>
    fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getProfile: (token: string) =>
    fetchAPI('/auth/profile', {
      method: 'GET',
      token,
    }),
}
