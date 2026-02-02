'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider, useAuth } from '@/app/context/AuthContext'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'
import Link from 'next/link'
import { Button } from './components/ui/Button'

const inter = Inter({ subsets: ['latin'] })

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth()

  if (loading) {
    return (
      <html lang="sr">
        <body className={`${inter.className} bg-gray-50`}>
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="sr">
      <body className={`${inter.className} bg-gray-50`}>
        <main className="min-h-screen">
          <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <Link href="/" className="text-xl font-semibold text-gray-900">
                    🤖 SmartTurist
                  </Link>
                </div>

                <div className="flex items-center space-x-4">
                  <Link
                    href="/search"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    🔍 AI Pretraga
                  </Link>

                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      >
                        👤 {user.firstName}
                      </Link>
                      <Button variant="outline" size="sm" onClick={logout}>
                        Odjavi se
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      >
                        Prijavi se
                      </Link>
                      <Link
                        href="/register"
                        className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Registruj se
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </nav>
          {children}
        </main>
      </body>
    </html>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RootLayoutContent>{children}</RootLayoutContent>
    </AuthProvider>
  )
}
