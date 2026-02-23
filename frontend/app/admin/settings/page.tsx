// app/admin/settings/page.tsx
import { headers } from 'next/headers'
import SimpleSettingsForm from '@/app/components/admin/SimpleSettingsForm'

const API_URL = process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default async function AdminSettingsPage() {
  // Dinamički base URL
  // const headersList = headers()
  // // const host = headersList.get('host')
  // const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  // const baseUrl = `${protocol}://${host}`

  // Dohvati podešavanja
  let initialData = null

  try {
    const res = await fetch(`${API_URL}/admin/settings`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (res.ok) {
      const { data } = await res.json()
      initialData = data
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Podešavanja</h1>
          <p className="text-gray-600 mt-1">Osnovna podešavanja aplikacije</p>
        </div>
      </div>

      <div className="px-8 py-6 max-w-3xl">
        <SimpleSettingsForm initialData={initialData} />
      </div>
    </div>
  )
}
