'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { Input } from '@/app/components/ui/Input'
import { Button } from '@/app/components/ui/Button'
import { Alert } from '@/app/components/ui/Alert'
import { GuestButton } from './GuestButton'
import Link from 'next/link'

export function LoginForm() {
  const router = useRouter()
  const { login, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    if (!email || !password) {
      setError('Molimo popunite sva polja.')
      setIsSubmitting(false)
      return
    }

    const result = await login(email, password)

    if (result.success) {
      router.push('/')
    } else {
      setError(result.message || 'Došlo je do greške pri prijavi.')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Prijavite se na vaš nalog
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <div className="rounded-md shadow-sm -space-y-px">
            <Input
              label="Email adresa"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="unesite@email.com"
              required
              autoComplete="email"
              disabled={isSubmitting || loading}
            />

            <Input
              label="Lozinka"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isSubmitting || loading}
            />
          </div>

          <div>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting || loading}>
              Prijavi se
            </Button>
          </div>

          <div className="text-sm text-center">
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Nemate nalog? Registrujte se
            </Link>
          </div>

          <GuestButton />
        </form>
      </div>
    </div>
  )
}
