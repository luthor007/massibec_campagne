import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, Trash2, Plus, Minus, Percent } from 'lucide-react'
import CheckoutForm from './CheckoutForm'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress' // Ensure this component exists and is correctly implemented

export default function Cart({ id }) {
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
    if (totalItems >= 12) {
      setDiscount(0.1)
    } else if (totalItems >= 6) {
      setDiscount(0.05)
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
  const currentDiscount = discount * 100 // Convert to percentage (0, 5, 10)

  // Calculate Discount Progress and Message
  let discountProgress = 0
  let message = ''

  if (!discountEnabled) {
    discountProgress = 0
    message = 'Les réductions sont désactivées pour cette boutique.'
  } else if (cartItemCount < 6) {
    discountProgress = (cartItemCount / 6) * 100
    message = `Ajoutez ${6 - cartItemCount} produit${6 - cartItemCount !== 1 ? 's' : ''} de plus pour obtenir 5% de réduction!`
  } else if (cartItemCount < 12) {
    discountProgress = ((cartItemCount - 6) / 6) * 100
    message = `Ajoutez ${12 - cartItemCount} produit${12 - cartItemCount !== 1 ? 's' : ''} de plus pour obtenir 10% de réduction!`
  } else {
    discountProgress = 100
    message = "Félicitations! Vous bénéficiez de la réduction maximale de 10%!"
  }

  // Calculate Totals
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountedTotal = total * (1 - discount)

  // Handle Checkout Modal
  const handleCheckout = useCallback(() => {
    setShowCheckout(true)
  }, [])

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
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
        <CardTitle className="text-xl flex items-center">
          <ShoppingBag className="mr-2 h-5 w-5" />
          Votre Panier
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">

        {/* New Discount Progress Bar and Info */}
        <div className={`border-l-4 p-4 mb-8 rounded-r-lg shadow-md ${
          !discountEnabled 
            ? 'bg-gray-100 border-gray-400' 
            : 'bg-blue-100 border-blue-500'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <ShoppingBag className={`h-6 w-6 mr-2 ${
                !discountEnabled ? 'text-gray-500' : 'text-blue-500'
              }`} />
              <span className={`font-semibold ${
                !discountEnabled ? 'text-gray-700' : 'text-blue-800'
              }`}>
                {cartItemCount} produit{cartItemCount !== 1 ? 's' : ''} dans votre panier
              </span>
            </div>
            <div className="flex items-center">
              <span className={`font-semibold ${
                !discountEnabled ? 'text-gray-600' : 'text-green-700'
              }`}>
                {currentDiscount}% de réduction
              </span>
            </div>
          </div>
          <Progress value={discountProgress} className="h-2 mb-2" />
          <p className={`text-sm ${
            !discountEnabled ? 'text-gray-600' : 'text-blue-700'
          }`}>
            {message}
          </p>
        </div>

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
            <ul className="space-y-4">
              {items.map((item) => (
                <motion.li
                  key={item.id} // Ensure 'id' is unique
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} x {item.price ? item.price.toFixed(2) : '0.00'}$
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={item.quantity <= 1} // Disable if quantity is 1
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium">{item.quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </AnimatePresence>
      </CardContent>
      {items.length > 0 && (
        <CardFooter className="bg-gray-50 p-4 flex-col space-y-4">
          <div className="flex justify-between w-full text-lg">
            <span className="font-medium">Sous-total:</span>
            <span>{total.toFixed(2)}$</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between w-full text-green-600">
              <span className="font-medium">Réduction ({discount * 100}%):</span>
              <span>-{(total * discount).toFixed(2)}$</span>
            </div>
          )}
          <div className="flex justify-between w-full font-bold text-xl">
            <span>Total:</span>
            <span>{discountedTotal.toFixed(2)}$</span>
          </div>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={handleCheckout}
          >
            Passer la commande
          </Button>
        </CardFooter>
      )}
      {showCheckout && (
        <CheckoutForm
          total={discountedTotal}
          items={items}
          onClose={() => setShowCheckout(false)}
          removeAllItem={removeAllItems}
          className="sm:max-h-600px"
        />
      )}
    </Card>
  )
}