'use client'

// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import AdminSidebar from '@/app/components/admin/AdminSidebar'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  if (user?.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
