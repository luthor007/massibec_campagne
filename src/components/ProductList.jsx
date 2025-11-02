import React, { useState, useEffect } from 'react'
import ProductCard from './ProductCard'
import { motion } from 'framer-motion'

export default function ProductList({ schoolId, campaignId }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Campaign-based approach: prioritize campaignId over schoolId
    // Products are universal, campaignId/schoolId is only used for custom pricing
    // If campaignId/schoolId becomes available later, products will reload with custom pricing
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Build URL with campaignId (preferred) or schoolId (fallback)
        // Add timestamp to bust cache and ensure fresh data with custom pricing
        const timestamp = Date.now()
        let url = `/api/products?limit=100&_t=${timestamp}`
        if (campaignId) {
          url = `/api/products?campaignId=${campaignId}&limit=100&_t=${timestamp}`
          console.log('Fetching products with campaignId (campaign-based):', campaignId)
        } else if (schoolId) {
          url = `/api/products?schoolId=${schoolId}&limit=100&_t=${timestamp}`
          console.log('Fetching products with schoolId (legacy):', schoolId)
        } else {
          console.log('Fetching products without campaignId or schoolId')
        }
        
        // Force no-cache to ensure we get fresh data with custom pricing
        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        // Handle both array and object response formats
        const productsArray = Array.isArray(data) 
          ? data 
          : (data.products || (data.data && Array.isArray(data.data) ? data.data : []))
        
        // Debug: Log prices to verify custom pricing is applied
        if (productsArray.length > 0) {
          const samplePrices = productsArray.slice(0, 5).map(p => ({
            name: p.name,
            price: p.price,
            originalPrice: p.originalPrice,
            hasCustomPrice: p.hasCustomPrice
          }));
          console.log('[ProductList] Sample product prices:', JSON.stringify(samplePrices, null, 2));
          
          // Also log if any products have custom prices
          const withCustomPrices = productsArray.filter(p => p.hasCustomPrice);
          console.log(`[ProductList] Products with custom prices: ${withCustomPrices.length} out of ${productsArray.length}`);
          if (withCustomPrices.length > 0) {
            console.log('[ProductList] Custom price examples:', withCustomPrices.slice(0, 3).map(p => ({
              name: p.name,
              default: p.originalPrice,
              custom: p.price,
              difference: p.price - p.originalPrice
            })));
          }
        }
        
        setProducts(productsArray)
        console.log('Products fetched:', productsArray.length, 'campaignId:', campaignId, 'schoolId:', schoolId)
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Failed to load products. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [schoolId, campaignId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6"
    >
      {products.map((product, index) => (
        <motion.div
          key={product.id || product._id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.08 }}
          className="h-full"
        >
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  )
}