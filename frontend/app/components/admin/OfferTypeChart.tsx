// components/admin/OfferTypeChart.tsx
'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface Props {
  data: Array<{
    offerType: string
    _count: number
  }>
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
const TYPE_NAMES = {
  HOTEL: 'Hoteli',
  FLIGHT: 'Letovi',
  PACKAGE: 'Paket aranžmani',
  OTHER: 'Ostalo',
}

export default function OfferTypeChart({ data }: Props) {
  const chartData = data.map(item => ({
    name: TYPE_NAMES[item.offerType as keyof typeof TYPE_NAMES] || item.offerType,
    value: item._count,
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipovi sačuvanih ponuda</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
            <span className="text-sm text-gray-600">{item.name}</span>
            <span className="text-sm font-medium ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
