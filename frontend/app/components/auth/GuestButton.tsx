'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { Button } from '@/app/components/ui/Button'

export function GuestButton() {
  const router = useRouter()
  const { guestLogin } = useAuth()

  const handleGuestLogin = () => {
    guestLogin()

    router.push('/')
  }

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-50 text-gray-500">ili</span>
        </div>
      </div>

      <div className="mt-6">
        <Button variant="outline" onClick={handleGuestLogin}>
          Nastavi kao gost
        </Button>
      </div>
    </div>
  )
}
