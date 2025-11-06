import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { ExternalLink } from 'lucide-react'

/**
 * Helper to parse 'YYYY-MM-DD' as a local date, not UTC.
 * JS Date will parse 'YYYY-MM-DD' as UTC and thus subtract local timezone hours.
 * This ensures new Date(<result>) refers to local midnight of the day intended.
 */
function parseDateLocal(dateString) {
  // Accepts 'YYYY-MM-DD'
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number)
    // month is 0-based in JS Date
    return new Date(year, month - 1, day)
  }
  return new Date(dateString)
}

function DeepAnalyticsCard({ 
  title, 
  value, 
  formatValue = (v) => v?.toFixed(2) || '0.00',
  formatCurrency = false,
  chartData = [],
  chartType = 'line', // 'line' or 'bar'
  chartDataKey = 'value',
  breakdown = [],
  className = ''
}) {
  const displayValue = formatCurrency ? `$${formatValue(value)}` : formatValue(value)

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Main Metric */}
        {value !== undefined && (
          <div className="mb-4">
            <div className="text-2xl font-bold text-gray-900">{displayValue}</div>
          </div>
        )}

        {/* Breakdown (if provided) */}
        {breakdown.length > 0 && (
          <div className="mb-4 space-y-1">
            {breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency ? `$${formatValue(item.value)}` : formatValue(item.value)}
                  {item.percentage !== undefined && (
                    <span className="ml-2 text-gray-500">({formatValue(item.percentage)}%)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-700 mb-2">ÉVOLUTION DANS LE TEMPS</p>
            <ResponsiveContainer width="100%" height={200}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tickFormatter={(value) => {
                      // Check if it's a date string (YYYY-MM-DD format)
                      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
                        const date = parseDateLocal(value)
                        return date.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })
                      }
                      // Otherwise, it's a product name - truncate if too long
                      return value && value.length > 15 ? value.substring(0, 15) + '...' : value
                    }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={(value) => formatCurrency ? `$${value}` : value.toString()}
                  />
                  <RechartsTooltip
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => {
                      const formatted = formatCurrency ? `$${formatValue(value)}` : formatValue(value)
                      return formatted
                    }}
                    labelFormatter={(label) => {
                      // Fix: Use parseDateLocal to display correct local day
                      const date = parseDateLocal(label)
                      return date.toLocaleDateString('fr-CA', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric' 
                      })
                    }}
                  />
                  <Bar dataKey={chartDataKey} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={(value) => {
                      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
                        const date = parseDateLocal(value)
                        return date.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })
                      }
                      return value
                    }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={(value) => formatCurrency ? `$${formatValue(value)}` : formatValue(value)}
                  />
                  <RechartsTooltip
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => {
                      const formatted = formatCurrency ? `$${formatValue(value)}` : formatValue(value)
                      return formatted
                    }}
                    labelFormatter={(label) => {
                      // Fix: Use parseDateLocal to display correct local day
                      const date = parseDateLocal(label)
                      return date.toLocaleDateString('fr-CA', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric' 
                      })
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={chartDataKey} 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DeepAnalyticsCard
