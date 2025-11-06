import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ExternalLink } from 'lucide-react'

function ConversionFunnelCard({ funnelData }) {
  const {
    visits = 0,
    addToCart = 0,
    checkoutReached = 0,
    paymentCompleted = 0,
    visitToCartRate = 0,
    cartToCheckoutRate = 0,
    checkoutToPaymentRate = 0,
    overallConversionRate = 0
  } = funnelData || {}

  const steps = [
    {
      label: 'Visites',
      value: visits,
      percentage: 100,
      color: 'bg-blue-500'
    },
    {
      label: 'Ajouté au panier',
      value: addToCart,
      percentage: visits > 0 ? (addToCart / visits) * 100 : 0,
      color: 'bg-green-500'
    },
    {
      label: 'Étape de paiement atteinte',
      value: checkoutReached,
      percentage: visits > 0 ? (checkoutReached / visits) * 100 : 0,
      color: 'bg-yellow-500'
    },
    {
      label: 'Paiement finalisé',
      value: paymentCompleted,
      percentage: visits > 0 ? (paymentCompleted / visits) * 100 : 0,
      color: 'bg-purple-500'
    }
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">Ventilation du taux de conversion</CardTitle>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Overall Conversion Rate */}
        <div className="mb-6">
          <div className="text-2xl font-bold text-gray-900">{overallConversionRate.toFixed(2)}%</div>
          <p className="text-xs text-gray-500 mt-1">Taux de conversion global</p>
        </div>

        {/* Funnel Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{step.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{step.value}</span>
                  <span className="text-gray-500">{step.percentage.toFixed(2)}%</span>
                </div>
              </div>
              <Progress
                value={step.percentage}
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ConversionFunnelCard

