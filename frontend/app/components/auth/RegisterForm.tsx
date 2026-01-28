'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { Input } from '@/app/components/ui/Input'
import { Button } from '@/app/components/ui/Button'
import { Alert } from '@/app/components/ui/Alert'
import Link from 'next/link'

export function RegisterForm() {
  const router = useRouter()
  const { register, loading } = useAuth()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('Molimo popunite sva polja.')
      setIsSubmitting(false)
      return
    }

    const result = await register(formData)

    if (result.success) {
      setSuccess('Uspešno ste se registrovali!')
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } else {
      setError(result.message || 'Došlo je do greške pri registraciji.')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Kreirajte novi nalog
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          {success && <Alert type="success" message={success} />}

          <div className="rounded-md shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ime"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Petar"
                required
                disabled={isSubmitting || loading}
              />

              <Input
                label="Prezime"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Petrović"
                required
                disabled={isSubmitting || loading}
              />
            </div>

            <Input
              label="Email adresa"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="petar@example.com"
              required
              disabled={isSubmitting || loading}
            />

            <Input
              label="Lozinka"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Najmanje 8 karaktera"
              required
              disabled={isSubmitting || loading}
            />

            <Input
              label="Potvrdite lozinku"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Ponovite lozinku"
              required
              disabled={isSubmitting || loading}
            />
          </div>

          <div>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting || loading}>
              Kreiraj nalog
            </Button>
          </div>

          <div className="text-sm text-center">
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Već imate nalog? Prijavite se
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
