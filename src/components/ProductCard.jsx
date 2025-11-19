import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Plus, Check, Info, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { useState, memo, useEffect } from 'react'
import { trackAddToCart } from '@/lib/analytics'
import { trackFirstAddToCart } from '@/lib/funnelAnalytics'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const ProductCard = ({ product, storeId, campaignId, schoolId, priority = false, inventory = null, isNotAvailable = false }) => {
  const router = useRouter()
  const { data: session } = useSession()
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  // Helper to check if image URL is valid (non-empty string)
  const hasValidImage = (url) => {
    return url && typeof url === 'string' && url.trim().length > 0
  }

  const normalizeBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
    }
    return false;
  };

  // Support both old format (freezable at root) and new format (attributes object)
  // Handle cases where attributes might be null, undefined, or an empty object
  const rawAttributes = product.attributes || {};
  const attributes = {
    freezable: rawAttributes.freezable !== undefined
      ? normalizeBoolean(rawAttributes.freezable)
      : (product.freezable !== undefined ? normalizeBoolean(product.freezable) : false),
    glutenFree: normalizeBoolean(rawAttributes.glutenFree),
    vegetarian: normalizeBoolean(rawAttributes.vegetarian),
    vegan: normalizeBoolean(rawAttributes.vegan),
    nutFree: normalizeBoolean(rawAttributes.nutFree),
    halal: normalizeBoolean(rawAttributes.halal),
    kosher: normalizeBoolean(rawAttributes.kosher),
    organic: normalizeBoolean(rawAttributes.organic),
    quebecProduct: normalizeBoolean(rawAttributes.quebecProduct),
    allergens: rawAttributes.allergens ? String(rawAttributes.allergens) : ''
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && product.name) {
    console.log(`[ProductCard] ${product.name}:`, {
      'product.attributes': product.attributes,
      'rawAttributes': rawAttributes,
      'processed attributes': attributes,
      'hasAnyAttribute': null // will be calculated next
    });
  }

  const attributeChips = [];

  if (attributes.freezable === true) {
    attributeChips.push({
      key: 'freezable',
      icon: '❄️',
      label: 'Congelable',
      styles: 'bg-cyan-50 border-cyan-200 text-cyan-800'
    });
  }
  if (attributes.glutenFree === true) {
    attributeChips.push({
      key: 'glutenFree',
      icon: '🌾',
      label: 'Sans gluten',
      styles: 'bg-green-50 border-green-200 text-green-800'
    });
  }
  if (attributes.vegetarian === true) {
    attributeChips.push({
      key: 'vegetarian',
      icon: '🥬',
      label: 'Végétarien',
      styles: 'bg-green-50 border-green-200 text-green-800'
    });
  }
  if (attributes.vegan === true) {
    attributeChips.push({
      key: 'vegan',
      icon: '🌱',
      label: 'Végétalien',
      styles: 'bg-green-50 border-green-200 text-green-800'
    });
  }
  if (attributes.nutFree === true) {
    attributeChips.push({
      key: 'nutFree',
      icon: '🥜',
      label: 'Sans noix',
      styles: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    });
  }
  if (attributes.halal === true) {
    attributeChips.push({
      key: 'halal',
      icon: '🕌',
      label: 'Halal',
      styles: 'bg-blue-50 border-blue-200 text-blue-800'
    });
  }
  if (attributes.kosher === true) {
    attributeChips.push({
      key: 'kosher',
      icon: '✡️',
      label: 'Kasher',
      styles: 'bg-blue-50 border-blue-200 text-blue-800'
    });
  }
  if (attributes.organic === true) {
    attributeChips.push({
      key: 'organic',
      icon: '🌿',
      label: 'Bio',
      styles: 'bg-green-50 border-green-200 text-green-800'
    });
  }
  if (attributes.quebecProduct === true) {
    attributeChips.push({
      key: 'quebecProduct',
      icon: '⚜️',
      label: 'Produit du Québec',
      styles: 'bg-red-50 border-red-200 text-red-800'
    });
  }

  const hasAllergens = Boolean(attributes.allergens && attributes.allergens.trim().length > 0);
  const hasAnyAttribute = attributeChips.length > 0 || hasAllergens;

  // Debug logging for hasAnyAttribute
  if (process.env.NODE_ENV === 'development' && product.name) {
    console.log(`[ProductCard] ${product.name} hasAnyAttribute:`, hasAnyAttribute);
  }

  const hasAdditionalInfo = Boolean(
    hasValidImage(product?.ingredientsImage) ||
    hasValidImage(product?.nutritionImage) ||
    hasAnyAttribute
  )

  // Get inventory for this specific product
  // Try exact match first, then case-insensitive match
  let productInventory = null;
  if (inventory && product.name) {
    // Try exact match
    productInventory = inventory[product.name];

    // If not found, try case-insensitive match
    if (!productInventory) {
      const productNameLower = product.name.toLowerCase().trim();
      const matchingKey = Object.keys(inventory).find(key =>
        key.toLowerCase().trim() === productNameLower
      );
      if (matchingKey) {
        productInventory = inventory[matchingKey];
        console.log(`[ProductCard] Found inventory with case-insensitive match: "${product.name}" -> "${matchingKey}"`);
      }
    }
  }

  const availableQuantity = productInventory?.available ?? null
  const isOutOfStock = availableQuantity !== null && availableQuantity === 0

  // isNotAvailable is passed as a prop from ProductList
  // It indicates if the product has no inventory in limited inventory mode

  // Check if we're in limited inventory mode (has any inventory records)
  const isLimitedInventoryMode = inventory && Object.keys(inventory).length > 0

  // Debug logging (remove in production)
  if (inventory && product.name && process.env.NODE_ENV === 'development') {
    console.log(`[ProductCard] ${product.name}:`, {
      hasInventory: !!inventory,
      inventoryKeys: Object.keys(inventory || {}),
      productInventory,
      availableQuantity,
      isOutOfStock,
      isLimitedInventoryMode,
      isNotAvailable,
      exactMatch: inventory?.[product.name] ? 'yes' : 'no'
    })
  }

  const addToCart = () => {
    // Check if product is not available in limited inventory mode
    if (isNotAvailable) {
      toast({
        title: "Produit non disponible",
        description: `${product.name} n'est pas disponible en inventaire limité.`,
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Check inventory if available
    if (availableQuantity !== null && availableQuantity === 0) {
      toast({
        title: "Produit épuisé",
        description: `${product.name} n'est plus disponible en inventaire.`,
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setIsAdding(true)
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]')
    const existingItem = cartItems.find(item => item.id === product.id)
    const quantityToAdd = existingItem ? 1 : 1

    // Check if adding would exceed inventory
    if (availableQuantity !== null) {
      const currentCartQuantity = existingItem ? existingItem.quantity : 0
      if (currentCartQuantity + quantityToAdd > availableQuantity) {
        toast({
          title: "Stock insuffisant",
          description: `Il ne reste que ${availableQuantity} unité(s) disponible(s) de ${product.name}.`,
          variant: "destructive",
          duration: 3000,
        })
        setIsAdding(false)
        return
      }
    }

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

      // Track first add to cart (if user is logged in)
      if (session?.user?.id && !existingItem) {
        // Only track if this is a new item being added (not incrementing existing)
        trackFirstAddToCart(session.user.id, storeId || router.query.id, product.id)
      }
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

  const ProductInfoContent = () => {
    // Recalculate attributeChips inside the modal to ensure fresh data
    const modalAttributeChips = [];

    if (attributes.freezable === true) {
      modalAttributeChips.push({
        key: 'freezable',
        icon: '❄️',
        label: 'Congelable',
        styles: 'bg-cyan-50 border-cyan-200 text-cyan-800'
      });
    }
    if (attributes.glutenFree === true) {
      modalAttributeChips.push({
        key: 'glutenFree',
        icon: '🌾',
        label: 'Sans gluten',
        styles: 'bg-green-50 border-green-200 text-green-800'
      });
    }
    if (attributes.vegetarian === true) {
      modalAttributeChips.push({
        key: 'vegetarian',
        icon: '🥬',
        label: 'Végétarien',
        styles: 'bg-green-50 border-green-200 text-green-800'
      });
    }
    if (attributes.vegan === true) {
      modalAttributeChips.push({
        key: 'vegan',
        icon: '🌱',
        label: 'Végétalien',
        styles: 'bg-green-50 border-green-200 text-green-800'
      });
    }
    if (attributes.nutFree === true) {
      modalAttributeChips.push({
        key: 'nutFree',
        icon: '🥜',
        label: 'Sans noix',
        styles: 'bg-yellow-50 border-yellow-200 text-yellow-800'
      });
    }
    if (attributes.halal === true) {
      modalAttributeChips.push({
        key: 'halal',
        icon: '🕌',
        label: 'Halal',
        styles: 'bg-blue-50 border-blue-200 text-blue-800'
      });
    }
    if (attributes.kosher === true) {
      modalAttributeChips.push({
        key: 'kosher',
        icon: '✡️',
        label: 'Kasher',
        styles: 'bg-blue-50 border-blue-200 text-blue-800'
      });
    }
    if (attributes.organic === true) {
      modalAttributeChips.push({
        key: 'organic',
        icon: '🌿',
        label: 'Bio',
        styles: 'bg-green-50 border-green-200 text-green-800'
      });
    }
    if (attributes.quebecProduct === true) {
      modalAttributeChips.push({
        key: 'quebecProduct',
        icon: '⚜️',
        label: 'Produit du Québec',
        styles: 'bg-red-50 border-red-200 text-red-800'
      });
    }

    const modalHasAllergens = Boolean(attributes.allergens && attributes.allergens.trim().length > 0);
    const modalHasAnyAttribute = modalAttributeChips.length > 0 || modalHasAllergens;

    // Debug logging for modal content
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ProductInfoContent] ${product.name}:`, {
        hasAnyAttribute,
        modalHasAnyAttribute,
        attributeChipsLength: attributeChips.length,
        modalAttributeChipsLength: modalAttributeChips.length,
        attributes,
        'product.attributes': product.attributes,
        'rawAttributes': rawAttributes
      });
    }

    return (
      <div className="space-y-6">
        {/* Attributs du produit */}
        {modalHasAnyAttribute ? (
          <section>
            <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-3">Caractéristiques</h3>
            {modalAttributeChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {modalAttributeChips.map(({ key, icon, label, styles }) => (
                  <div key={key} className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg ${styles}`}>
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            )}
            {modalHasAllergens && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs font-semibold text-orange-800 mb-1">⚠️ Allergènes:</p>
                <p className="text-sm text-orange-700">{attributes.allergens}</p>
              </div>
            )}
          </section>
        ) : (
          // Always show debug info in development to help diagnose
          process.env.NODE_ENV === 'development' && (
            <section>
              <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-3">Caractéristiques (Debug)</h3>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 mb-2">⚠️ Debug Info - Attributes not detected</p>
                <div className="text-xs space-y-1">
                  <p><strong>product.attributes:</strong> {product.attributes ? JSON.stringify(product.attributes) : 'undefined'}</p>
                  <p><strong>product.freezable:</strong> {product.freezable !== undefined ? String(product.freezable) : 'undefined'}</p>
                  <p><strong>rawAttributes:</strong> {JSON.stringify(rawAttributes)}</p>
                  <p><strong>processed attributes:</strong> {JSON.stringify(attributes)}</p>
                  <p><strong>attributeChips.length:</strong> {attributeChips.length}</p>
                  <p><strong>modalAttributeChips.length:</strong> {modalAttributeChips.length}</p>
                  <p><strong>hasAnyAttribute:</strong> {String(hasAnyAttribute)}</p>
                  <p><strong>modalHasAnyAttribute:</strong> {String(modalHasAnyAttribute)}</p>
                </div>
              </div>
            </section>
          )
        )}
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
  }

  return (
    <motion.div
      whileHover={isNotAvailable ? {} : { scale: 1.03 }}
      whileTap={isNotAvailable ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="h-full"
    >
      <Card className={`overflow-hidden h-full flex flex-col shadow-md transition-shadow border-2 hover:shadow-xl hover:border-blue-300`}>
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
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm sm:text-base font-bold text-blue-600">
              {typeof product.price === 'number' ? `${product.price.toFixed(2)}$` : 'Prix non disponible'}
            </p>
            {(availableQuantity !== null || isNotAvailable) && (
              <Badge
                variant={(isOutOfStock || isNotAvailable) ? "destructive" : "default"}
                className={(isOutOfStock || isNotAvailable) ? "bg-red-500" : "bg-green-500"}
              >
                {(isOutOfStock || isNotAvailable) ? "Épuisé" : `${availableQuantity} disponible${availableQuantity > 1 ? 's' : ''}`}
              </Badge>
            )}
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
            className={`w-full relative overflow-hidden transition-all duration-300 ease-out transform font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 text-sm sm:text-base ${justAdded
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 hover:shadow-lg'
              : (isOutOfStock || isNotAvailable)
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:scale-105 hover:shadow-lg'
              }`}
            data-testid="add-to-cart"
            onClick={addToCart}
            disabled={isAdding || isOutOfStock || isNotAvailable}
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
