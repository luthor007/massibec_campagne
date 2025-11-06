import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts'
import { ExternalLink, Smartphone, Monitor, Tablet } from 'lucide-react'

const COLORS = {
  mobile: '#10b981',
  desktop: '#3b82f6',
  tablet: '#f59e0b',
  unknown: '#9ca3af'
}

function DeviceTypeCard({ deviceData }) {
  const {
    mobile = 0,
    desktop = 0,
    tablet = 0,
    unknown = 0
  } = deviceData || {}

  const total = mobile + desktop + tablet + unknown

  const chartData = [
    { name: 'Mobile', value: mobile, color: COLORS.mobile },
    { name: 'Desktop', value: desktop, color: COLORS.desktop },
    { name: 'Tablette', value: tablet, color: COLORS.tablet },
    { name: 'Inconnu', value: unknown, color: COLORS.unknown }
  ].filter(item => item.value > 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">Visites par type d'appareil</CardTitle>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Total */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <p className="text-xs text-gray-500 mt-1">Total des visites</p>
        </div>

        {/* Breakdown */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-3 w-3 text-green-600" />
              <span className="text-gray-600">Mobile</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{mobile}</span>
              <span className="text-gray-500">({total > 0 ? ((mobile / total) * 100).toFixed(1) : 0}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Monitor className="h-3 w-3 text-blue-600" />
              <span className="text-gray-600">Desktop</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{desktop}</span>
              <span className="text-gray-500">({total > 0 ? ((desktop / total) * 100).toFixed(1) : 0}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Tablet className="h-3 w-3 text-amber-600" />
              <span className="text-gray-600">Tablette</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{tablet}</span>
              <span className="text-gray-500">({total > 0 ? ((tablet / total) * 100).toFixed(1) : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        {chartData.length > 0 && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DeviceTypeCard

