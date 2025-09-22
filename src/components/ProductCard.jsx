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

    setTimeout(() => setIsAdding(false), 500)
  }

  return (
    <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
      <Card className="overflow-hidden h-full flex flex-col">
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
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-lg mb-2">{product.name}</CardTitle>
          <p className="text-muted-foreground">
            {typeof product.price === 'number' ? `${product.price.toFixed(2)}$` : 'Prix non disponible'}
          </p>
        </CardContent>
        <CardFooter className="p-4">
          <Button className="          relative overflow-hidden transition-all duration-300 ease-out
          transform hover:scale-105 hover:shadow-lg
          bg-gradient-to-r from-blue-500 to-indigo-600
          text-white font-semibold py-3 px-6 rounded-full
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
        w-full" onClick={addToCart} disabled={isAdding}>
            {isAdding ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              >
                <Plus className="mr-2 h-4 w-4" />
              </motion.div>
            ) : (
              <ShoppingCart className="mr-2 h-4 w-4" />
            )}
            {isAdding ? 'Ajouté!' : 'Ajouter au panier'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}