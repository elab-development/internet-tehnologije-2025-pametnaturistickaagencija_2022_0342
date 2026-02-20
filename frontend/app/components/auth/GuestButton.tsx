'use client'

import Link from 'next/link'
import { Button } from '../ui/Button'

export function GuestButton() {
  return (
    <div className="mt-6 flex flex-col items-center">
      <div className="relative w-full">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm w-full">
          <span className="px-2 bg-gray-50 text-gray-500">ili</span>
        </div>
      </div>

      <div className="mt-6">
        <Button className="flex !p-0" type="button" variant="outline">
          <Link className="w-full h-full px-4 py-2" href="/">
            Nastavi kao gost
          </Link>
        </Button>
      </div>
    </div>
  )
}
