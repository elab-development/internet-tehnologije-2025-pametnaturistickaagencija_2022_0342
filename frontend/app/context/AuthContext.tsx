'use client'

import React, { createContext, useState, useContext, useEffect } from 'react'

export type UserRole = 'USER' | 'ADMIN' | 'GUEST'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  loading: boolean
}

interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

interface LoginResponse {
  user: User
  token: string
}

interface RegisterResponse {
  user: User
  token: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedToken = localStorage.getItem('token')
        const savedUser = localStorage.getItem('user')

        if (savedToken && savedUser) {
          setToken(savedToken)
          setUser(JSON.parse(savedUser))
        }
      } catch (error) {
        console.error('Greška pri proveri sesije:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)

      if (!email || !password) {
        return { success: false, message: 'Molimo popunite sva obavezna polja.' }
      }

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, message: 'Pogrešan email ili lozinka.' }
        }
        return { success: false, message: data.message || 'Došlo je do greške pri prijavi.' }
      }

      const { user, token } = data as LoginResponse

      setUser(user)
      setToken(token)

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      return { success: true }
    } catch (error) {
      console.error('Greška pri prijavi:', error)
      return { success: false, message: 'Došlo je do greške pri prijavi. Pokušajte ponovo.' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    try {
      setLoading(true)

      const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword']
      const emptyFields = requiredFields.filter(field => !data[field as keyof RegisterData])

      if (emptyFields.length > 0) {
        return { success: false, message: 'Molimo popunite sva obavezna polja.' }
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        return { success: false, message: 'Email nije validan.' }
      }

      if (data.password.length < 8) {
        return { success: false, message: 'Lozinka mora imati najmanje 8 karaktera.' }
      }

      if (data.password !== data.confirmPassword) {
        return { success: false, message: 'Lozinke se ne poklapaju.' }
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'USER',
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          return { success: false, message: 'Nalog sa tim email-om već postoji.' }
        }
        return {
          success: false,
          message: responseData.message || 'Došlo je do greške pri registraciji.',
        }
      }

      const { user, token } = responseData as RegisterResponse

      setUser(user)
      setToken(token)

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      return { success: true }
    } catch (error) {
      console.error('Greška pri registraciji:', error)
      return { success: false, message: 'Došlo je do greške pri registraciji. Pokušajte ponovo.' }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth mora biti korišćen unutar AuthProvider')
  }
  return context
}
