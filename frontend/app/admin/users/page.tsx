'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import UsersTable from '@/app/components/admin/UsersTable'
import UsersHeader from '@/app/components/admin/UsersHeader'
import UsersFilters from '@/app/components/admin/UsersFilters'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function AdminUsersPage() {
  const searchParams = useSearchParams()

  // query iz URL-a (address bar)
  const page = useMemo(() => {
    const p = parseInt(searchParams.get('page') || '1', 10)
    return Number.isFinite(p) && p > 0 ? p : 1
  }, [searchParams])

  const limit = 10

  const search = useMemo(() => searchParams.get('search') || '', [searchParams])
  const role = useMemo(() => searchParams.get('role') || '', [searchParams])
  const sortBy = useMemo(() => searchParams.get('sortBy') || 'createdAt', [searchParams])
  const sortOrder = useMemo(() => searchParams.get('sortOrder') || 'desc', [searchParams])

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('token')
        if (!token) throw new Error('Niste ulogovani (token ne postoji).')

        // Pravimo URL za API poziv
        const url = new URL(`${API_URL}/admin/users`)
        url.searchParams.set('page', String(page))
        url.searchParams.set('limit', String(limit))
        url.searchParams.set('search', search)
        url.searchParams.set('role', role)
        url.searchParams.set('sortBy', sortBy)
        url.searchParams.set('sortOrder', sortOrder)

        const res = await fetch(url.toString(), {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          let msg = `Greška (${res.status})`
          try {
            const j = await res.json()
            msg = j?.error || j?.message || msg
          } catch {}
          throw new Error(msg)
        }

        const json = await res.json()
        if (!json?.success) throw new Error('Neispravan odgovor servera.')

        if (!cancelled) setData(json.data)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Greška pri učitavanju podataka')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [page, limit, search, role, sortBy, sortOrder])

  // UI states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UsersHeader />
        <div className="px-8 py-6">Učitavanje…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UsersHeader />
        <div className="px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold">Greška pri učitavanju podataka</h2>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UsersHeader />
        <div className="px-8 py-6">Nema podataka.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UsersHeader />

      <div className="px-8 py-6">
        {/* Statistika */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600">Ukupno korisnika</p>
            <p className="text-2xl font-bold text-gray-900">{data.pagination?.total ?? 0}</p>
          </div>

          {data.roleStats?.map((stat: any) => (
            <div key={stat.role} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-600">Korisnika ({stat.role})</p>
              <p className="text-2xl font-bold text-gray-900">{stat._count}</p>
            </div>
          ))}
        </div>

        {/* Filteri */}
        <UsersFilters currentSearch={search} currentRole={role} />

        {/* Tabela */}
        <UsersTable
          users={data.users}
          pagination={data.pagination}
          currentSort={{ field: sortBy, order: sortOrder }}
        />
      </div>
    </div>
  )
}
