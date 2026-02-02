'use client'

import { useAuth } from '@/app/context/AuthContext'
import { Button } from '@/app/components/ui/Button'
import Link from 'next/link'

export default function HomePage() {
  const { user, logout } = useAuth()

  const getWelcomeMessage = () => {
    if (!user) return 'Dobrodošli'

    switch (user.role) {
      case 'ADMIN':
        return `Dobrodošli, Administrator ${user.firstName || ''}`
      case 'USER':
        return `Dobrodošli, ${user.firstName || ''}`
      case 'GUEST':
        return 'Dobrodošli kao gost'
      default:
        return 'Dobrodošli'
    }
  }

  const getDashboardContent = () => {
    if (!user || user.role === 'GUEST') {
      return (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Kao gost imate ograničene privilegije. Registrujte se za pun pristup.
          </p>
          <div className="space-y-3">
            <Link href="/register">
              <Button variant="primary">Registrujte se</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Prijavite se</Button>
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Informacije o nalogu</h3>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Uloga:</strong> {user.role}
          </p>
          {user.firstName && (
            <p>
              <strong>Ime:</strong> {user.firstName}
            </p>
          )}
        </div>

        {user.role === 'ADMIN' && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium mb-2 text-blue-900">Administratorske privilegije</h3>
            <ul className="list-disc list-inside text-blue-800">
              <li>Pregled svih korisnika</li>
              <li>Upravljanje sistemom</li>
              <li>Pristup svim funkcionalnostima</li>
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{getWelcomeMessage()}</h1>
          {user && (
            <Button variant="outline" onClick={logout} className="w-auto">
              Odjavi se
            </Button>
          )}
        </div>

        {getDashboardContent()}
      </div>
    </div>
  )
}
