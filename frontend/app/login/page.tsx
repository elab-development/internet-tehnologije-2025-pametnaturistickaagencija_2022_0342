'use client'

import { useRouter } from 'next/navigation'
import { LoginForm } from '../components/auth/LoginForm'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

export default function LoginPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) return router.push('/')
  }, [user, router])

  return <LoginForm />
}
