import React, { useState, useEffect } from 'react'
import ProductCard from './ProductCard'
import { motion } from 'framer-motion'

export default function ProductList({ schoolId, campaignId, storeId, isReady = false, initialProducts = null }) {
  const [products, setProducts] = useState(initialProducts || [])
  const [loading, setLoading] = useState(!initialProducts)
  const [error, setError] = useState(null)
  const [inventory, setInventory] = useState({})

  useEffect(() => {
    // If we have initial products from SSR, use them and skip fetching
    if (initialProducts && initialProducts.length > 0) {
      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[ProductList] Using initial products from SSR:', initialProducts.length);
        const sampleProduct = initialProducts[0];
        console.log('[ProductList] Sample initial product (full object):', sampleProduct);
        console.log('[ProductList] Sample initial product attributes:', {
          productName: sampleProduct.name,
          hasAttributes: !!sampleProduct.attributes,
          attributes: sampleProduct.attributes,
          'product.attributes type': typeof sampleProduct.attributes,
          'product.attributes keys': sampleProduct.attributes ? Object.keys(sampleProduct.attributes) : 'N/A'
        });

        // Check all products for attributes
        const productsWithAttributes = initialProducts.filter(p => p.attributes);
        console.log('[ProductList] SSR Products with attributes:', productsWithAttributes.length, 'out of', initialProducts.length);
        if (productsWithAttributes.length === 0) {
          console.warn('[ProductList] ⚠️ NO SSR PRODUCTS HAVE ATTRIBUTES! This suggests SSR is not including attributes.');
        }
      }
      setProducts(initialProducts)
      setLoading(false)
      return
    }

    // Only fetch if store data is ready (isReady flag)
    // This prevents double-fetching when campaignId/schoolId are initially undefined
    if (!isReady) {
      return
    }

    // Campaign-based approach: prioritize campaignId over schoolId
    // Products are universal, campaignId/schoolId is only used for custom pricing
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        // Build URL with campaignId (preferred) or schoolId (fallback)
        // campaignId and schoolId can be null (determined), but not undefined (not yet determined)
        let url = `/api/products?limit=100`
        if (campaignId) {
          url = `/api/products?campaignId=${campaignId}&limit=100`
        } else if (schoolId) {
          url = `/api/products?schoolId=${schoolId}&limit=100`
        }

        // Use Next.js fetch with default caching behavior
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        // Handle both array and object response formats
        const productsArray = Array.isArray(data)
          ? data
          : (data.products || (data.data && Array.isArray(data.data) ? data.data : []))

        // Debug logging in development
        if (process.env.NODE_ENV === 'development' && productsArray.length > 0) {
          console.log('[ProductList] Fetched products:', productsArray.length);
          const sampleProduct = productsArray[0];
          console.log('[ProductList] Sample product (full object):', sampleProduct);
          console.log('[ProductList] Sample product attributes:', {
            productName: sampleProduct.name,
            hasAttributes: !!sampleProduct.attributes,
            attributes: sampleProduct.attributes,
            'product.attributes type': typeof sampleProduct.attributes,
            'product.attributes keys': sampleProduct.attributes ? Object.keys(sampleProduct.attributes) : 'N/A'
          });

          // Check all products for attributes
          const productsWithAttributes = productsArray.filter(p => p.attributes);
          console.log('[ProductList] Products with attributes:', productsWithAttributes.length, 'out of', productsArray.length);
          if (productsWithAttributes.length === 0) {
            console.warn('[ProductList] ⚠️ NO PRODUCTS HAVE ATTRIBUTES! This suggests the API is not returning attributes.');
          }
        }

        setProducts(productsArray)
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Failed to load products. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [schoolId, campaignId, isReady, initialProducts])

  // Fetch inventory for the store
  useEffect(() => {
    if (!storeId || !isReady) return

    const fetchInventory = async () => {
      try {
        console.log(`[ProductList] Fetching inventory for storeId: ${storeId}`)
        const response = await fetch(`/api/inventory/store/${storeId}`)
        if (response.ok) {
          const data = await response.json()
          console.log(`[ProductList] Inventory received:`, data.inventory)
          setInventory(data.inventory || {})
        } else {
          console.warn(`[ProductList] Failed to fetch inventory: ${response.status}`)
        }
      } catch (err) {
        console.error('[ProductList] Error fetching inventory:', err)
        // Don't show error to user, just log it
      }
    }

    fetchInventory()
  }, [storeId, isReady])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>
  }

  if (!Array.isArray(products) || products.length === 0) {
    return <p className="text-gray-500 text-center text-lg">Aucun produit disponible. Revenez plus tard!</p>
  }

  // Check if we have any inventory (limited stock mode)
  const hasInventory = inventory && Object.keys(inventory).length > 0;

  // Sort products: products with inventory first, then products without inventory
  // Also filter out products without inventory if we're in limited stock mode
  const sortedProducts = hasInventory
    ? [...products].sort((a, b) => {
      const aHasInventory = inventory[a.name]?.available !== undefined && inventory[a.name]?.available !== null;
      const bHasInventory = inventory[b.name]?.available !== undefined && inventory[b.name]?.available !== null;

      if (aHasInventory && !bHasInventory) return -1;
      if (!aHasInventory && bHasInventory) return 1;
      return 0;
    })
    : products;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
      {sortedProducts.map((product, index) => {
        const productInventory = inventory && product.name ? inventory[product.name] : null;
        const hasInventoryForProduct = productInventory?.available !== undefined && productInventory?.available !== null;
        const isOutOfStock = hasInventoryForProduct && productInventory.available === 0;

        return (
          <motion.div
            key={product.id || product._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
            className="h-full"
          >
            <ProductCard
              product={product}
              storeId={storeId}
              campaignId={campaignId}
              schoolId={schoolId}
              priority={index < 6}
              inventory={inventory}
              isNotAvailable={hasInventory && !hasInventoryForProduct}
            />
          </motion.div>
        );
      })}
    </div>
  )
}