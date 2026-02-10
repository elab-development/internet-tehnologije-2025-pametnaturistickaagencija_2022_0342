'use client'

import { RegisterForm } from '@/app/components/auth/RegisterForm'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (user) {
    return router.push('/')
  }
  return <RegisterForm />
}
