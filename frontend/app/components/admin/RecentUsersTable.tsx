// components/admin/RecentUsersTable.tsx
'use client'

import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'
import { Mail, Phone, MessageSquare, Building } from 'lucide-react'

interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
  createdAt: string
  _count: {
    savedOffers: number
    chats: number
  }
}

interface Props {
  users: User[]
}

export default function RecentUsersTable({ users }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Nedavni korisnici</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {users.map(user => (
          <div key={user.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Building className="w-3 h-3" />
                        {user._count.savedOffers} smeštaja
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MessageSquare className="w-3 h-3" />
                        {user._count.chats} chatova
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : user.role === 'USER'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {user.role}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(user.createdAt), {
                    addSuffix: true,
                    locale: sr,
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Pogledaj sve korisnike →
        </button>
      </div>
    </div>
  )
}
