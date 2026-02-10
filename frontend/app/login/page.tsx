'use client'

import { useRouter } from 'next/navigation'
import { LoginForm } from '../components/auth/LoginForm'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (user) {
    return router.push('/')
  }

  return <LoginForm />
}
