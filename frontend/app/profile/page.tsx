'use client'

import { useAuth } from '@/app/context/AuthContext'
import { Button } from '@/app/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) router.replace('/login')
  }, [user, router])

  const initials = user && (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Moj profil</h1>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-28 relative">
          <div className="absolute -bottom-8 left-6">
            <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow flex items-center justify-center text-xl font-bold text-gray-700">
              {initials}
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 pt-12 space-y-6">
          {/* NAME */}
          <div>
            <p className="text-sm text-gray-500">Ime i prezime</p>
            <p className="text-lg font-semibold">
              {user?.firstName} {user?.lastName}
            </p>
          </div>

          {/* EMAIL */}
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-lg font-semibold">{user?.email}</p>
          </div>

          {/* ROLE */}
          <div>
            <p className="text-sm text-gray-500">Uloga</p>
            <span className="inline-block px-3 py-1 rounded bg-gray-100 text-gray-700 text-sm font-medium">
              {user?.role}
            </span>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => router.push('/')}>
              Nazad na početnu
            </Button>

            <Button variant="primary" onClick={() => router.push('/saved')}>
              Sačuvane ponude
            </Button>

            <Button
              variant="danger"
              onClick={() => {
                logout()
                router.push('/login')
              }}
            >
              Odjava
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
