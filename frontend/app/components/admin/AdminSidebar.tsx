// components/admin/AdminSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Settings, BarChart3, Home, Shield, Bell, Database, LogOut } from 'lucide-react'
import { useAuth } from '@/app/context/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Korisnici', href: '/admin/users', icon: Users },
  { name: 'Sistemska podešavanja', href: '/admin/settings', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { loading, user, logout } = useAuth()

  return (
    <div className="w-64 bg-white shadow-lg min-h-screen">
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
        <p className="text-sm text-gray-600">Sistem za upravljanje</p>
      </div>

      <nav className="mt-4">
        {navigation.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          )
        })}

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors mt-8"
        >
          <LogOut size={20} />
          Odjavi se
        </button>
      </nav>
    </div>
  )
}
