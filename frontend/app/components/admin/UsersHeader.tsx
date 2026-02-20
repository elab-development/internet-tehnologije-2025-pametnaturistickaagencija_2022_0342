// components/admin/users/UsersHeader.tsx
'use client'

export default function UsersHeader() {
  return (
    <div className="bg-white shadow">
      <div className="px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Korisnici</h1>
          <p className="text-gray-600 mt-1">Pregled i upravljanje svim korisnicima sistema</p>
        </div>
      </div>
    </div>
  )
}
