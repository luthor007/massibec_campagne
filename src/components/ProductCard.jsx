import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Plus, Check, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, memo, useEffect } from 'react'
import { trackAddToCart } from '@/lib/analytics'
import { useRouter } from 'next/router'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const ProductCard = ({ product, storeId, campaignId, schoolId, priority = false }) => {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  // Helper to check if image URL is valid (non-empty string)
  const hasValidImage = (url) => {
    return url && typeof url === 'string' && url.trim().length > 0
  }

  const hasAdditionalInfo = Boolean(
    hasValidImage(product?.ingredientsImage) ||
    hasValidImage(product?.nutritionImage)
  )

  const addToCart = () => {
    setIsAdding(true)
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]')
    const existingItem = cartItems.find(item => item.id === product.id)
    const quantityToAdd = existingItem ? 1 : 1

    if (existingItem) {
      existingItem.quantity += 1
    } else {
      cartItems.push({ ...product, quantity: 1 })
    }

    localStorage.setItem('cartItems', JSON.stringify(cartItems))
    window.dispatchEvent(new Event('storage'))
    // Notify onboarding flow that an item was added
    window.dispatchEvent(new CustomEvent('itemAddedToCart'))

    // Track add to cart event
    if (storeId) {
      trackAddToCart({
        storeId: storeId || router.query.id,
        campaignId: campaignId || null,
        schoolId: schoolId || null,
        userId: null, // Will be extracted from session in API
        productId: product.id,
        quantity: quantityToAdd,
        price: product.price
      })
    }

    // Show success feedback
    setJustAdded(true)
    toast({
      title: "Produit ajouté!",
      description: `${product.name} a été ajouté au panier`,
      duration: 2000,
    })

    setTimeout(() => {
      setIsAdding(false)
      setJustAdded(false)
    }, 800)
  }

  const ProductInfoContent = () => (
    <div className="space-y-6">
      <section>
        <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-3">Liste d&apos;ingrédients</h3>
        {product.ingredientsImage ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2">
            <img
              src={product.ingredientsImage}
              alt={`Liste d'ingrédients - ${product.name}`}
              className="w-full h-auto max-w-full"
              style={{ maxHeight: '600px', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Non disponible pour ce produit.</p>
        )}
      </section>
      <section>
        <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-3">Tableau de valeur nutritive</h3>
        {product.nutritionImage ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2">
            <img
              src={product.nutritionImage}
              alt={`Valeur nutritive - ${product.name}`}
              className="w-full h-auto max-w-full"
              style={{ maxHeight: '600px', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Non disponible pour ce produit.</p>
        )}
      </section>
    </div>
  )

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="h-full"
    >
      <Card className="overflow-hidden h-full flex flex-col shadow-md hover:shadow-xl transition-shadow border-2 hover:border-blue-300">
        <CardHeader className="p-0 relative">
          <div className="relative w-full" style={{ paddingTop: '100%' }}>
            <Image
              src={product.image || '/placeholder.svg'}
              alt={product.name}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
            />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 flex-grow">
          <CardTitle className="text-base sm:text-lg mb-2 line-clamp-2">{product.name}</CardTitle>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm sm:text-base font-bold text-blue-600">
              {typeof product.price === 'number' ? `${product.price.toFixed(2)}$` : 'Prix non disponible'}
            </p>
            {hasAdditionalInfo ? (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 hover:scale-110 hover:shadow-md hover:ring-2 hover:ring-blue-200 active:scale-95"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsDialogOpen(true)
                    }}
                  >
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Voir les ingrédients et valeurs nutritives</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] lg:max-w-[900px] xl:max-w-[1000px] w-[95vw] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle className="text-lg lg:text-xl">Informations sur {product.name}</DialogTitle>
                    <DialogDescription>
                      Consultez les images fournies par le fournisseur pour ce produit.
                    </DialogDescription>
                  </DialogHeader>
                  <ProductInfoContent />
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="p-3 sm:p-4 pt-0">
          <Button
            className={`w-full relative overflow-hidden transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 text-sm sm:text-base ${justAdded
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
              }`}
            data-testid="add-to-cart"
            onClick={addToCart}
            disabled={isAdding}
          >
            {justAdded ? (
              <>
                <Check className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Ajouté!</span>
                <span className="sm:hidden">Ajouté!</span>
              </>
            ) : isAdding ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
              </motion.div>
            ) : (
              <>
                <ShoppingCart className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Ajouter au panier</span>
                <span className="sm:hidden">Ajouter</span>
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

export default memo(ProductCard)
