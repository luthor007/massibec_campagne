import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { ShoppingBag, ChevronUp, Plus, Minus, Trash2, ArrowRight } from 'lucide-react'
import CheckoutForm from './CheckoutForm'
import { motion, AnimatePresence } from 'framer-motion'
import { trackCheckoutReached } from '@/lib/analytics'

export default function StickyCartMobile({ id, campaignId, schoolId, onCheckoutOpen, campaignData, initialDeliveryOptions }) {
  const [items, setItems] = useState([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [showFullCart, setShowFullCart] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [discountEnabled, setDiscountEnabled] = useState(true)

  const updateDiscount = useCallback((cartItems) => {
    if (!discountEnabled) {
      setDiscount(0)
      return
    }

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    if (totalItems >= 6) {
      setDiscount(0.05)
    } else {
      setDiscount(0)
    }
  }, [discountEnabled])

  const fetchCartItems = useCallback(() => {
    const savedItems = JSON.parse(localStorage.getItem('cartItems') || '[]')
    setItems(savedItems)
    updateDiscount(savedItems)
  }, [updateDiscount])

  const fetchStoreData = useCallback(async () => {
    if (!id) return

    try {
      const response = await fetch(`/api/stores/${id}`)
      if (response.ok) {
        const data = await response.json()
        setDiscountEnabled(data.discountEnabled !== false)
      }
    } catch (error) {
      console.error('Error fetching store data:', error)
    }
  }, [id])

  useEffect(() => {
    fetchCartItems()
    fetchStoreData()
    window.addEventListener('storage', fetchCartItems)
    // Listen for custom events from Cart component
    window.addEventListener('itemAddedToCart', fetchCartItems)
    return () => {
      window.removeEventListener('storage', fetchCartItems)
      window.removeEventListener('itemAddedToCart', fetchCartItems)
    }
  }, [fetchCartItems, fetchStoreData])

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountedTotal = total * (1 - discount)

  const handleCheckout = useCallback(() => {
    setShowCheckout(true)
    setShowFullCart(false)
    if (onCheckoutOpen) {
      onCheckoutOpen()
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('checkoutOpened'))
    }
    // Track checkout reached event
    if (id) {
      trackCheckoutReached({
        storeId: id,
        campaignId: campaignId || null,
        schoolId: schoolId || null,
        userId: null // Will be extracted from session in API
      })
    }
  }, [onCheckoutOpen, id, campaignId, schoolId])

  // Remove a Specific Item
  const removeItem = useCallback((itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId)
    setItems(updatedItems)
    localStorage.setItem('cartItems', JSON.stringify(updatedItems))
    updateDiscount(updatedItems)
    // Dispatch storage event to sync with Cart component
    window.dispatchEvent(new Event('storage'))
  }, [items, updateDiscount])

  // Update Quantity of a Specific Item
  const updateQuantity = useCallback((itemId, change) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + change
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null
      }
      return item
    }).filter(Boolean)
    setItems(updatedItems)
    localStorage.setItem('cartItems', JSON.stringify(updatedItems))
    updateDiscount(updatedItems)
    // Dispatch storage event to sync with Cart component
    window.dispatchEvent(new Event('storage'))
  }, [items, updateDiscount])

  // Don't render if cart is empty unless checkout modal is open (keeps success dialog visible)
  if (cartItemCount === 0 && !showCheckout) {
    return null
  }

  return (
    <>
      {/* Sticky Cart Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-700 border-t-2 border-blue-400 shadow-2xl">
        {!showFullCart ? (
          <div
            className="px-4 py-3 flex items-center justify-between cursor-pointer"
            onClick={() => setShowFullCart(true)}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <ShoppingBag className="h-6 w-6 text-white" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {cartItemCount} produit{cartItemCount !== 1 ? 's' : ''}
                </span>
                <span className="text-lg font-bold text-white">
                  {discountedTotal.toFixed(2)}$
                  {discount > 0 && (
                    <span className="ml-2 text-xs text-green-300 line-through opacity-75">
                      {total.toFixed(2)}$
                    </span>
                  )}
                </span>
              </div>
              {discount > 0 && (
                <div className="hidden sm:flex items-center bg-green-500 px-2 py-1 rounded-full">
                  <span className="text-xs font-bold text-white">-5%</span>
                </div>
              )}
            </div>
            <ChevronUp className="h-5 w-5 text-white" />
          </div>
        ) : (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="max-h-[70vh] overflow-y-auto"
          >
            <div className="px-4 py-3 border-b border-white/20 flex items-center justify-between bg-blue-700">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="h-6 w-6 text-white" />
                <span className="text-lg font-semibold text-white">Votre Panier</span>
              </div>
              <button
                onClick={() => setShowFullCart(false)}
                className="text-white hover:text-gray-200"
              >
                <ChevronUp className="h-5 w-5 rotate-180" />
              </button>
            </div>

            <div className="px-4 py-2 bg-white space-y-2">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between py-2 border-b border-gray-100 gap-3"
                >
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.price ? item.price.toFixed(2) : '0.00'}$ unitaire
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={item.quantity <= 1}
                      className="h-7 w-7 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-semibold text-sm min-w-[1.5rem] text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="h-7 w-7 border-gray-300 hover:bg-gray-100"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Price and Delete */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
                      {(item.quantity * item.price).toFixed(2)}$
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="px-4 py-3 bg-white border-t border-gray-200 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sous-total:</span>
                <span className="font-medium">{total.toFixed(2)}$</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Réduction ({discount * 100}%):</span>
                  <span>-{(total * discount).toFixed(2)}$</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                <span>Total:</span>
                <span className="text-blue-600">{discountedTotal.toFixed(2)}$</span>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-4 mt-3 font-bold shadow-xl text-base rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                onClick={handleCheckout}
              >
                <span>Passer la commande</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <CheckoutForm
            total={discountedTotal}
            originalTotal={total}
            discount={discount}
            discountAmount={total * discount}
            items={items}
            onClose={() => {
              setShowCheckout(false)
              setShowFullCart(false)
            }}
            removeAllItem={() => {
              setItems([])
              localStorage.setItem('cartItems', JSON.stringify([]))
              updateDiscount([])
            }}
            campaignId={campaignId}
            schoolId={schoolId}
            storeId={id}
            initialCampaignData={campaignData}
            initialDeliveryOptions={initialDeliveryOptions}
          />
        )}
      </AnimatePresence>
    </>
  )
}
