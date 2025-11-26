import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, Trash2, Plus, Minus, Percent } from 'lucide-react'
import CheckoutForm from './CheckoutForm'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress' // Ensure this component exists and is correctly implemented
import { trackCheckoutReached } from '@/lib/analytics'
import { trackCheckoutReachedFunnel } from '@/lib/funnelAnalytics'
import { useSession } from 'next-auth/react'

export default function Cart({ id, campaignId, schoolId, campaignData, initialDeliveryOptions, isExample = false }) {
  const { data: session } = useSession()
  const [items, setItems] = useState([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [discountEnabled, setDiscountEnabled] = useState(true)

  // Memoize updateDiscount to prevent unnecessary re-renders
  const updateDiscount = useCallback((cartItems) => {
    if (!discountEnabled) {
      setDiscount(0)
      return
    }

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    if (totalItems >= 6) {
      setDiscount(0.05) // Only 5% discount, no 10% discount
    } else {
      setDiscount(0)
    }
  }, [discountEnabled])

  // Memoize fetchCartItems
  const fetchCartItems = useCallback(() => {
    const savedItems = JSON.parse(localStorage.getItem('cartItems') || '[]')
    setItems(savedItems)
    updateDiscount(savedItems)
  }, [updateDiscount])

  // Fetch store data to get discount settings
  const fetchStoreData = useCallback(async () => {
    if (!id) return

    try {
      const response = await fetch(`/api/stores/${id}`)
      if (response.ok) {
        const data = await response.json()
        setDiscountEnabled(data.discountEnabled !== false) // Default to true if not set
      }
    } catch (error) {
      console.error('Error fetching store data:', error)
    }
  }, [id])

  useEffect(() => {
    fetchCartItems()
    fetchStoreData()
    window.addEventListener('storage', fetchCartItems)
    return () => {
      window.removeEventListener('storage', fetchCartItems)
    }
  }, [fetchCartItems, fetchStoreData])

  // Calculate Cart Item Count
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const currentDiscount = discount * 100 // Convert to percentage (0, 5)

  // Calculate Discount Progress and Message
  let discountProgress = 0
  let message = ''

  if (!discountEnabled) {
    discountProgress = 0
    message = 'Les réductions sont désactivées pour cette boutique.'
  } else if (cartItemCount < 6) {
    discountProgress = (cartItemCount / 6) * 100
    message = `Ajoutez ${6 - cartItemCount} produit${6 - cartItemCount !== 1 ? 's' : ''} de plus pour obtenir 5% de réduction!`
  } else {
    discountProgress = 100
    message = "Félicitations! Vous bénéficiez de la réduction de 5%!"
  }

  // Calculate Totals
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountedTotal = total * (1 - discount)

  // Handle Checkout Modal
  const handleCheckout = useCallback(() => {
    if (isExample) {
      return // Don't open checkout in example mode
    }
    setShowCheckout(true)
    // Notify onboarding flow that checkout opened
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('checkoutOpened'))
    }
    // Track checkout reached event (both conversion and funnel)
    if (id) {
      trackCheckoutReached({
        storeId: id,
        campaignId: campaignId || null,
        schoolId: schoolId || null,
        userId: null // Will be extracted from session in API
      })

      // Also track in funnel if user is logged in
      if (session?.user?.id) {
        trackCheckoutReachedFunnel(session.user.id, id, campaignId || null)
      }
    }
  }, [id, campaignId, schoolId, isExample, session?.user?.id])

  // Remove a Specific Item
  const removeItem = useCallback((id) => {
    const updatedItems = items.filter(item => item.id !== id) // Ensure 'id' is unique
    setItems(updatedItems)
    localStorage.setItem('cartItems', JSON.stringify(updatedItems))
    updateDiscount(updatedItems)
  }, [items, updateDiscount])

  // Update Quantity of a Specific Item
  const updateQuantity = useCallback((id, change) => {
    const updatedItems = items.map(item => {
      if (item.id === id) { // Ensure 'id' is unique
        const newQuantity = item.quantity + change
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null
      }
      return item
    }).filter(Boolean)
    setItems(updatedItems)
    localStorage.setItem('cartItems', JSON.stringify(updatedItems))
    updateDiscount(updatedItems)
  }, [items, updateDiscount])

  // Remove All Items from Cart
  const removeAllItems = useCallback(() => {
    setItems([])
    localStorage.setItem('cartItems', JSON.stringify([]))
    updateDiscount([])
  }, [updateDiscount])

  // Debugging: Log items and their id
  useEffect(() => {
    console.log('Cart Items:', items)
  }, [items])

  return (
    <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4">
        <CardTitle className="text-lg sm:text-xl flex items-center">
          <ShoppingBag className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Votre Panier
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">

        {/* New Discount Progress Bar and Info - Only show if discounts are enabled */}
        {discountEnabled && (
          <div className="border-l-4 p-3 sm:p-4 mb-4 sm:mb-6 lg:mb-8 rounded-r-lg shadow-md bg-blue-100 border-blue-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
              <div className="flex items-center">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 mr-2 flex-shrink-0 text-blue-500" />
                <span className="font-semibold text-sm sm:text-base text-blue-800">
                  {cartItemCount} produit{cartItemCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-sm sm:text-base text-green-700">
                  {currentDiscount}% de réduction
                </span>
              </div>
            </div>
            <Progress value={discountProgress} className="h-2 mb-2" />
            <p className="text-xs sm:text-sm text-blue-700">
              {message}
            </p>
          </div>
        )}

        <AnimatePresence>
          {items.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-500 text-center py-4"
            >
              Votre panier est vide.
            </motion.p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-center justify-between bg-gray-50 p-2.5 sm:p-3 rounded-lg gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.price ? item.price.toFixed(2) : '0.00'}$ unitaire
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={item.quantity <= 1}
                      className="h-7 w-7 sm:h-8 sm:w-8 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <span className="font-semibold text-sm min-w-[1.5rem] text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="h-7 w-7 sm:h-8 sm:w-8 border-gray-300 hover:bg-gray-100"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-gray-900 whitespace-nowrap min-w-[3rem] text-right">
                      {(item.quantity * item.price).toFixed(2)}$
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </AnimatePresence>
      </CardContent>
      {items.length > 0 && (
        <CardFooter className="bg-gray-50 p-3 sm:p-4 flex-col space-y-3 sm:space-y-4">
          <div className="flex justify-between w-full text-base sm:text-lg">
            <span className="font-medium">Sous-total:</span>
            <span>{total.toFixed(2)}$</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between w-full text-sm sm:text-base text-green-600">
              <span className="font-medium">Réduction ({discount * 100}%):</span>
              <span>-{(total * discount).toFixed(2)}$</span>
            </div>
          )}
          <div className="flex justify-between w-full font-bold text-lg sm:text-xl">
            <span>Total:</span>
            <span>{discountedTotal.toFixed(2)}$</span>
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 sm:py-4 text-base font-semibold shadow-lg cart-checkout-button disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="checkout-button"
            onClick={handleCheckout}
            disabled={isExample}
          >
            {isExample ? 'Boutique exemple - Commande désactivée' : 'Passer la commande'}
          </Button>
        </CardFooter>
      )}
      {showCheckout && (
        <CheckoutForm
          total={discountedTotal}
          originalTotal={total}
          discount={discount}
          discountAmount={total * discount}
          items={items}
          onClose={() => setShowCheckout(false)}
          removeAllItem={removeAllItems}
          campaignId={campaignId}
          schoolId={schoolId}
          storeId={id}
          initialCampaignData={campaignData}
          initialDeliveryOptions={initialDeliveryOptions}
          className="sm:max-h-600px"
          isExample={isExample}
        />
      )}
    </Card>
  )
}