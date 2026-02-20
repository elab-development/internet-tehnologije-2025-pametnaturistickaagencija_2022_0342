// components/admin/DashboardStats.tsx
'use client'

import { Users, Building, MessageSquare, Activity } from 'lucide-react'

interface StatsProps {
  totals: {
    users: number
    savedOffers: number
    chats: number
    messages: number
    activeToday: number
  }
}

const statsConfig = [
  {
    label: 'Ukupno korisnika',
    key: 'users',
    icon: Users,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    label: 'Sačuvani smeštaji',
    key: 'savedOffers',
    icon: Building,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  {
    label: 'Aktivni chatovi',
    key: 'chats',
    icon: MessageSquare,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    label: 'Aktivni danas',
    key: 'activeToday',
    icon: Activity,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
]

export default function DashboardStats({ totals }: StatsProps) {
  // Dodatna stavka - možete dodati bilo koju statistiku
  const customStat = {
    label: 'Ukupno poruka',
    value: totals.messages,
    icon: MessageSquare,
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map(stat => {
          const Icon = stat.icon
          const value = totals[stat.key as keyof typeof totals]

          return (
            <div
              key={stat.key}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                </div>
                <div className={`${stat.bgColor} p-4 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-gray-500">Od osnivanja sistema</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dodatna kartica za vašu stavku */}
      <div className="mt-6">
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{customStat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{customStat.value}</p>
              <p className="text-xs text-gray-500 mt-2">Ukupan broj poruka u svim chatovima</p>
            </div>
            <div className={`${customStat.bgColor} p-4 rounded-lg`}>
              <customStat.icon className={`w-6 h-6 ${customStat.textColor}`} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
