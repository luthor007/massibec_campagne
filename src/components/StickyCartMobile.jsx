import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { ShoppingBag, ChevronUp, Plus, Minus, Trash2 } from 'lucide-react'
import CheckoutForm from './CheckoutForm'
import { motion, AnimatePresence } from 'framer-motion'

export default function StickyCartMobile({ id, campaignId, schoolId, onCheckoutOpen }) {
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
  }, [onCheckoutOpen])

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

  // Don't render if cart is empty
  if (cartItemCount === 0) {
    return null
  }

  return (
    <>
      {/* Sticky Cart Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-blue-500 shadow-2xl">
        {!showFullCart ? (
          <div 
            className="px-4 py-3 flex items-center justify-between cursor-pointer"
            onClick={() => setShowFullCart(true)}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {cartItemCount} produit{cartItemCount !== 1 ? 's' : ''}
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {discountedTotal.toFixed(2)}$
                </span>
              </div>
            </div>
            <ChevronUp className="h-5 w-5 text-gray-600" />
          </div>
        ) : (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="max-h-[70vh] overflow-y-auto"
          >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-blue-50">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">Votre Panier</span>
              </div>
              <button
                onClick={() => setShowFullCart(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronUp className="h-5 w-5 rotate-180" />
              </button>
            </div>
            
            <div className="px-4 py-3 space-y-2">
              {items.map((item) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col py-3 border-b border-gray-100 gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.price ? item.price.toFixed(2) : '0.00'}$ unitaire
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900 ml-2 whitespace-nowrap">
                      {(item.quantity * item.price).toFixed(2)}$
                    </span>
                  </div>
                  
                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                        className="h-8 w-8 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-medium text-base min-w-[2rem] text-center">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-8 w-8 border-gray-300 hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-2">
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 mt-3 font-semibold shadow-lg"
                onClick={handleCheckout}
              >
                Passer la commande
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
          />
        )}
      </AnimatePresence>
    </>
  )
}
