'use client'

import { useEffect, useState } from 'react'

import DashboardStats from '@/app/components/admin/DashboardStats'
import RecentUsersTable from '@/app/components/admin/RecentUsersTable'
import OfferTypeChart from '@/app/components/admin/OfferTypeChart'
import DailyActivityChart from '@/app/components/admin/DailyActivityChart'
import QuickActions from '@/app/components/admin/QuickActions'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

type DashboardResponse = {
  success: boolean
  data: {
    totals: {
      users: number
      savedOffers: number
      chats: number
      messages: number
      activeToday: number
    }
    usersByRole: Array<{ role: string; _count: number | { _all?: number } }>
    offerTypeStats: Array<{ offerType: string; _count: number | { _all?: number } }>
    recentUsers: any[]
    dailyStats: Array<{ date: string; count: number }>
  }
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('Niste ulogovani (token ne postoji).')
        }

        const res = await fetch(`${API_URL}/admin/dashboard-stats`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })

        if (!res.ok) {
          // pokušaj da pročitaš poruku greške ako server šalje JSON
          let msg = `Greška (${res.status})`
          try {
            const j = await res.json()
            msg = j?.error || j?.message || msg
          } catch {}
          throw new Error(msg)
        }

        const json: DashboardResponse = await res.json()

        if (!json?.success || !json?.data) {
          throw new Error('Neispravan odgovor servera.')
        }

        if (!cancelled) setDashboard(json.data)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Greška pri učitavanju podataka.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="p-8">Učitavanje…</div>
  }

  if (error) {
    return <div className="p-8 text-red-600">Greška: {error}</div>
  }

  if (!dashboard) {
    return <div className="p-8">Nema podataka.</div>
  }

  // Prisma groupBy ponekad vraća _count kao objekat; normalizuj na broj
  const normalizeCount = (c: any) => (typeof c === 'number' ? c : (c?._all ?? 0))

  const usersByRole = (dashboard.usersByRole || []).map((x: any) => ({
    ...x,
    _count: normalizeCount(x._count),
  }))

  const offerTypeStats = (dashboard.offerTypeStats || []).map((x: any) => ({
    ...x,
    _count: normalizeCount(x._count),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6">
        {/* Stats Cards */}
        <DashboardStats totals={dashboard.totals} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <OfferTypeChart data={offerTypeStats} />
          <DailyActivityChart data={dashboard.dailyStats} />
        </div>

        {/* Recent Users and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <RecentUsersTable users={dashboard.recentUsers} />
          </div>
        </div>

        {/* Users by Role */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Korisnici po ulogama</h2>
          <div className="grid grid-cols-3 gap-4">
            {usersByRole.map((item: any) => (
              <div key={item.role} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{item._count}</div>
                <div className="text-sm text-gray-600">{item.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
