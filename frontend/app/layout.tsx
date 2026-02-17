'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider, useAuth } from '@/app/context/AuthContext'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'

const inter = Inter({ subsets: ['latin'] })

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()

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
                  <h1 className="text-xl font-semibold text-gray-900">Sistem za prijavu</h1>
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
