// components/admin/users/UsersTable.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Building,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'

interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
  phone: string | null
  createdAt: string
  lastActive: string | null
  _count: {
    savedOffers: number
    chats: number
  }
}

interface Props {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  currentSort: {
    field: string
    order: string
  }
}

export default function UsersTable({ users, pagination, currentSort }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const handleSort = (field: string) => {
    const params = new URLSearchParams(window.location.search)

    // Zadrži postojeće filtere
    if (params.get('search')) params.set('search', params.get('search')!)
    if (params.get('role')) params.set('role', params.get('role')!)

    const currentOrder = currentSort.field === field ? currentSort.order : 'desc'
    const newOrder = currentOrder === 'desc' ? 'asc' : 'desc'

    params.set('sortBy', field)
    params.set('sortOrder', newOrder)
    params.set('page', '1') // Vrati na prvu stranicu pri sortiranju

    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u.id))
    }
  }

  const handleSelectUser = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (user.role === 'ADMIN') {
      alert('Ne možete obrisati admin korisnika!')
      return
    }
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userToDelete.id] }),
      })

      if (res.ok) {
        router.refresh()
        setShowDeleteModal(false)
        setUserToDelete(null)
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const getSortIcon = (field: string) => {
    if (currentSort.field !== field) {
      return <ArrowUpDown size={16} className="text-gray-400" />
    }
    return currentSort.order === 'desc' ? (
      <ArrowDown size={16} className="text-blue-600" />
    ) : (
      <ArrowUp size={16} className="text-blue-600" />
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-50 px-6 py-3 border-b border-blue-200 flex items-center justify-between">
            <span className="text-sm text-blue-700">Izabrano {selectedUsers.length} korisnika</span>
            <div className="flex items-center gap-3">
              <button className="text-sm text-blue-700 hover:text-blue-900">Pošalji email</button>
              <button className="text-sm text-red-600 hover:text-red-800">Obriši izabrane</button>
              <button
                onClick={() => setSelectedUsers([])}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Poništi
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('firstName')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Korisnik
                  {getSortIcon('firstName')}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Email
                  {getSortIcon('email')}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('role')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Uloga
                  {getSortIcon('role')}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktivnost
                </span>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Datum
                  {getSortIcon('createdAt')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    disabled={user.role === 'ADMIN'}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Phone size={12} />
                          {user.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{user.email}</span>
                    {user.role === 'ADMIN' && <CheckCircle size={16} className="text-green-500" />}
                  </div>
                </td>
                <td className="px-6 py-4">
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
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-600">{user._count.chats} chatova</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {user._count.savedOffers} smeštaja
                      </span>
                    </div>
                    {user.lastActive && (
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(user.lastActive), {
                            addSuffix: true,
                            locale: sr,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                      locale: sr,
                    })}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {user.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Prikazano{' '}
            <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> -{' '}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            od <span className="font-medium">{pagination.total}</span> korisnika
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>

            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum = pagination.page
              if (pagination.totalPages <= 5) {
                pageNum = i + 1
              } else if (pagination.page <= 3) {
                pageNum = i + 1
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i
              } else {
                pageNum = pagination.page - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 rounded-lg ${
                    pagination.page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Potvrda brisanja</h3>
            <p className="text-gray-600 mb-4">
              Da li ste sigurni da želite da obrišete korisnika{' '}
              <span className="font-medium">
                {userToDelete.firstName} {userToDelete.lastName}
              </span>
              ? Ova akcija je nepovratna i obrisaće sve chatove i sačuvane ponude ovog korisnika.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Otkaži
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
