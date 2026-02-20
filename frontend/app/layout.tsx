'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider, useAuth } from '@/app/context/AuthContext'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'
import Link from 'next/link'
import { Button } from './components/ui/Button'
import { useRouter } from 'next/navigation'
import { Footer } from './components/layout/Footer'
const inter = Inter({ subsets: ['latin'] })

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <html lang="sr" data-theme={'dark'}>
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
                  {user?.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="relative px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Admin Panel
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                    </Link>
                  )}
                  <Link
                    href="/"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    🔍 Početna
                  </Link>

                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      >
                        👤 {user.firstName}
                      </Link>
                      <Button
                        variant="outline"
                        className="cursor-pointer"
                        size="sm"
                        onClick={logout}
                      >
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
        <Footer />
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
