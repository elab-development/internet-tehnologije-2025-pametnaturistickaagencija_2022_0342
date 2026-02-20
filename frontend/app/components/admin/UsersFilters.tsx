// components/admin/users/UsersFilters.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, Filter, X } from 'lucide-react'

interface Props {
  currentSearch: string
  currentRole: string
}

export default function UsersFilters({ currentSearch, currentRole }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [search, setSearch] = useState(currentSearch)
  const [role, setRole] = useState(currentRole)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (role) params.set('role', role)
      params.set('page', '1')

      router.push(`${pathname}?${params.toString()}`)
    }, 500)

    return () => clearTimeout(timeout)
  }, [search, role, router, pathname])

  const clearFilters = () => {
    setSearch('')
    setRole('')
    router.push(pathname)
  }

  const hasFilters = search || role

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Pretraži korisnike po imenu, emailu ili telefonu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            showFilters || hasFilters
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter size={20} />
          Filteri
          {hasFilters && (
            <span className="ml-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
              {(search ? 1 : 0) + (role ? 1 : 0)}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900"
          >
            <X size={18} />
            Obriši filtere
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uloga</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sve uloge</option>
                <option value="ADMIN">Admin</option>
                <option value="USER">User</option>
                <option value="GUEST">Guest</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum registracije
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Svi datumi</option>
                <option>Poslednjih 7 dana</option>
                <option>Poslednjih 30 dana</option>
                <option>Poslednjih 90 dana</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aktivnost</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Svi korisnici</option>
                <option>Aktivni danas</option>
                <option>Aktivni ove nedelje</option>
                <option>Neaktivni 30+ dana</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
