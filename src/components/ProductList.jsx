import React, { useState, useEffect } from 'react'
import ProductCard from './ProductCard'
import { motion } from 'framer-motion'

export default function ProductList({ schoolId, campaignId, storeId, isReady = false, initialProducts = null }) {
  const [products, setProducts] = useState(initialProducts || [])
  const [loading, setLoading] = useState(!initialProducts)
  const [error, setError] = useState(null)

  useEffect(() => {
    // If we have initial products from SSR, use them and skip fetching
    if (initialProducts && initialProducts.length > 0) {
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
      {products.map((product, index) => (
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
          />
        </motion.div>
      ))}
    </div>
  )
}