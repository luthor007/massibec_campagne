import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function ProductCard({ product }) {
  const [isAdding, setIsAdding] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const addToCart = () => {
    setIsAdding(true)
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]')
    const existingItem = cartItems.find(item => item.id === product.id)

    if (existingItem) {
      existingItem.quantity += 1
    } else {
      cartItems.push({ ...product, quantity: 1 })
    }

    localStorage.setItem('cartItems', JSON.stringify(cartItems))
    window.dispatchEvent(new Event('storage'))
    // Notify onboarding flow that an item was added
    window.dispatchEvent(new CustomEvent('itemAddedToCart'))

    setTimeout(() => setIsAdding(false), 500)
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.03 }} 
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="h-full"
    >
      <Card className="overflow-hidden h-full flex flex-col shadow-md hover:shadow-xl transition-shadow">
        <CardHeader className="p-0">
          <div className="relative w-full" style={{ paddingTop: '100%' }}>
            <Image
              src={product.image || '/placeholder.svg'}
              alt={product.name}
              layout="fill"
              objectFit="cover"
            />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 flex-grow">
          <CardTitle className="text-base sm:text-lg mb-2 line-clamp-2">{product.name}</CardTitle>
          <p className="text-sm sm:text-base font-semibold text-blue-600">
            {typeof product.price === 'number' ? `${product.price.toFixed(2)}$` : 'Prix non disponible'}
          </p>
        </CardContent>
        <CardFooter className="p-3 sm:p-4 pt-0">
          <Button 
            className="w-full relative overflow-hidden transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 text-sm sm:text-base"
            data-testid="add-to-cart"
            onClick={addToCart} 
            disabled={isAdding}
          >
            {isAdding ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
              </motion.div>
            ) : (
              <ShoppingCart className="mr-1 sm:mr-2 h-4 w-4" />
            )}
            <span className="hidden sm:inline">{isAdding ? 'Ajouté!' : 'Ajouter au panier'}</span>
            <span className="sm:hidden">{isAdding ? 'Ajouté!' : 'Ajouter'}</span>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}