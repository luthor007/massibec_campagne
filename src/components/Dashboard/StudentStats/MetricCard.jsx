import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'

function MetricCard({ 
  title, 
  value = 0, 
  previousValue, 
  formatValue,
  formatCurrency = false,
  chartData = [],
  chartDataKey = 'value',
  chartDataKeyPrevious = 'previousValue',
  breakdown = [],
  className = ''
}) {
  // Default format function
  const defaultFormatValue = (v) => {
    if (formatValue) return formatValue(v)
    return v?.toFixed(2) || '0.00'
  }

  // Calculate growth percentage
  const growth = useMemo(() => {
    if (previousValue === undefined || previousValue === null) return undefined
    if (previousValue === 0) {
      return value > 0 ? 100 : 0
    }
    return Math.round(((value - previousValue) / previousValue) * 100)
  }, [value, previousValue])

  const isPositive = growth !== undefined && growth >= 0
  const formattedValue = defaultFormatValue(value)
  const displayValue = formatCurrency ? `$${formattedValue}` : formattedValue

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
        <div className="mb-4">
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="text-2xl font-bold text-gray-900">{displayValue}</span>
            {growth !== undefined && (
              <span className={`text-sm font-medium flex items-center ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPositive ? (
                  <ArrowUp className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDown className="h-3 w-3 mr-0.5" />
                )}
                {Math.abs(growth)}%
              </span>
            )}
          </div>
          {previousValue !== undefined && previousValue !== null && (
            <p className="text-xs text-gray-500">
              vs {formatCurrency ? `$${defaultFormatValue(previousValue)}` : defaultFormatValue(previousValue)} période précédente
            </p>
          )}
        </div>

        {/* Breakdown (if provided) */}
        {breakdown.length > 0 && (
          <div className="mb-4 space-y-1">
            {breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{item.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {formatCurrency ? `$${defaultFormatValue(item.value)}` : defaultFormatValue(item.value)}
                  </span>
                  {item.growth !== undefined && (
                    <span className={`text-xs font-medium ${
                      item.growth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.growth >= 0 ? '+' : ''}{item.growth}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-700 mb-2">ÉVOLUTION DANS LE TEMPS</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={11}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={11}
                  tickFormatter={(value) => formatCurrency ? `$${defaultFormatValue(value)}` : defaultFormatValue(value)}
                />
                <RechartsTooltip
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value, name) => {
                    const formatted = formatCurrency ? `$${defaultFormatValue(value)}` : defaultFormatValue(value)
                    return [formatted, name === chartDataKey ? 'Période actuelle' : 'Période précédente']
                  }}
                  labelFormatter={(label) => {
                    const date = new Date(label)
                    return date.toLocaleDateString('fr-CA', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    })
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey={chartDataKey} 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  name="Période actuelle"
                />
                {chartDataKeyPrevious && chartData.some(d => d[chartDataKeyPrevious] !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey={chartDataKeyPrevious} 
                    stroke="#9ca3af" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Période précédente"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MetricCard

