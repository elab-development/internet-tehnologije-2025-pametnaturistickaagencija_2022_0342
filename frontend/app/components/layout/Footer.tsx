'use client'

import Link from 'next/link'

export function Footer({ email, phoneNumber }: { email: string; phoneNumber: string }) {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* BRAND */}
        <div>
          <h3 className="text-white text-lg font-semibold mb-3">Pametna Turistička Agencija</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            AI pretraga putovanja, hotela i letova na jednom mestu. Brzo, jednostavno i bez
            skrivenih troškova.
          </p>
        </div>

        {/* NAVIGATION */}
        <div>
          <h4 className="text-white font-medium mb-3">Navigacija</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-white transition">
                Početna
              </Link>
            </li>
            <li>
              <Link href="/search" className="hover:text-white transition">
                Pretraga
              </Link>
            </li>
            <li>
              <Link href="/saved" className="hover:text-white transition">
                Sačuvane ponude
              </Link>
            </li>
          </ul>
        </div>

        {/* LEGAL */}
        <div>
          <h4 className="text-white font-medium mb-3">Legalno</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="hover:text-white transition">
                Politika privatnosti
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition">
                Uslovi korišćenja
              </Link>
            </li>
          </ul>
        </div>

        {/* CONTACT */}
        <div>
          <h4 className="text-white font-medium mb-3">Kontakt</h4>
          <ul className="space-y-2 text-sm">
            <li>{email}</li>
            <li>{phoneNumber}</li>
            <li>Beograd, Srbija</li>
          </ul>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-gray-800 text-center text-sm text-gray-500 py-4">
        © {year} Pametna Turistička Agencija — Sva prava zadržana.
      </div>
    </footer>
  )
}
