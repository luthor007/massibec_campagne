import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { ExternalLink, MapPin } from 'lucide-react'

function LocationCard({ locationData }) {
  if (!locationData || Object.keys(locationData).length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">Visites par emplacement</CardTitle>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-500">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = Object.entries(locationData)
    .map(([location, count]) => ({
      location,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 locations

  const total = Object.values(locationData).reduce((sum, count) => sum + count, 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">Visites par emplacement</CardTitle>
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

        {/* Top Locations List */}
        <div className="mb-4 space-y-2 max-h-32 overflow-y-auto">
          {chartData.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <MapPin className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{item.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{item.count}</span>
                <span className="text-gray-500">({total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        {chartData.length > 0 && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="location" 
                  stroke="#6b7280"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={11}
                />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default LocationCard

