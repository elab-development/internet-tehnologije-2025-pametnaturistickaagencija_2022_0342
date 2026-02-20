'use client'

import { useEffect, useMemo, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

type SavedOffer = {
  id: number
  name: string
  price: number
  siteLinks: string[] | null
  offerType: string
  date: string
  createdAt?: string
}

export default function SavedOffersPage() {
  const [offers, setOffers] = useState<SavedOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)

      if (!token) throw new Error('Niste ulogovani (nema tokena).')

      const res = await fetch(`${API_URL}/saved-offers`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`)
      }

      // backend ti trenutno vraća ili [] ili {success,data}
      const data = Array.isArray(json) ? json : json?.data
      setOffers(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message || 'Greška pri učitavanju.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleDelete = async (id: number) => {
    try {
      if (!token) throw new Error('Niste ulogovani (nema tokena).')
      setDeletingId(id)

      const res = await fetch(`${API_URL}/saved-offers/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`)
      }

      setOffers(prev => prev.filter(o => o.id !== id))
    } catch (e: any) {
      alert(e?.message || 'Greška pri brisanju.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sačuvane ponude</h1>
            <p className="text-gray-600 mt-1">Vaša lista sačuvanih smeštaja.</p>
          </div>

          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
          >
            Osveži
          </button>
        </div>
      </div>

      <div className="px-8 py-6">
        {loading && <div className="bg-white rounded-xl shadow-sm p-6">Učitavanje…</div>}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="text-red-800 font-semibold">Greška</div>
            <div className="text-red-700 mt-1">{error}</div>
          </div>
        )}

        {!loading && !error && offers.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">Nemate sačuvanih ponuda još.</div>
        )}

        {!loading && !error && offers.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {offers.map(offer => (
              <div key={offer.id} className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{offer.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Tip: <span className="font-medium">{offer.offerType}</span>
                      {offer.date ? (
                        <>
                          {' '}
                          • Datum:{' '}
                          <span className="font-medium">
                            {new Date(offer.date).toLocaleDateString('sr-RS')}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{offer.price}</div>
                    <div className="text-sm text-gray-600">ukupno</div>
                  </div>
                </div>

                {Array.isArray(offer.siteLinks) && offer.siteLinks.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-2">Linkovi:</div>
                    <div className="flex flex-col gap-2">
                      {offer.siteLinks.slice(0, 3).map((link, idx) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => handleDelete(offer.id)}
                    disabled={deletingId === offer.id}
                    className="px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingId === offer.id ? 'Brisanje…' : 'Obriši'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
