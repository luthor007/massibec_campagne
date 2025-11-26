import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ProductList from '../components/ProductList'
import Cart from '../components/Cart'
import StickyCartMobile from '../components/StickyCartMobile'
import { AlertCircle, Percent, Clock } from 'lucide-react'
import ShareSection from '../components/ShareSection'
import StoreInfoCard from '../components/StoreInfoCard'
import { motion } from 'framer-motion'
import { Progress } from "@/components/ui/progress"
import dbConnect from '../lib/mongodb'
import Product from '../models/Product'
import sanitizeHtml from 'sanitize-html'

export default function Exemple({ initialProducts }) {
    const [cartItemCount, setCartItemCount] = useState(0)
    const [discountProgress, setDiscountProgress] = useState(0)
    const [currentDiscount, setCurrentDiscount] = useState(0)
    const [discountEnabled, setDiscountEnabled] = useState(true)

    // Example store data
    const storeName = "Boutique Exemple - Marie Dubois"
    const storeDescription = "Voici un exemple de boutique pour vous donner une idée de ce à quoi ressemble une boutique étudiante. Vous pouvez parcourir les produits et ajouter des articles au panier, mais les commandes ne peuvent pas être passées dans cette boutique exemple."
    const ownerName = "Marie Dubois"
    const ownerEmail = "marie.dubois@exemple.com"
    const ownerPhone = "514-123-4567"
    const schoolName = "École Exemple"
    const orderDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
    const deliveryDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString() // 21 days from now

    useEffect(() => {
        const updateCartItemCount = () => {
            const savedItems = JSON.parse(localStorage.getItem('cartItems') || '[]')
            const totalItems = savedItems.reduce((sum, item) => sum + item.quantity, 0)
            setCartItemCount(totalItems)

            if (discountEnabled) {
                if (totalItems >= 12) {
                    setDiscountProgress(100)
                    setCurrentDiscount(10)
                } else if (totalItems >= 6) {
                    setDiscountProgress(100)
                    setCurrentDiscount(5)
                } else {
                    setCurrentDiscount(0)
                    setDiscountProgress((totalItems / 6) * 100)
                }
            } else {
                setCurrentDiscount(0)
                setDiscountProgress(0)
            }
        }

        updateCartItemCount()
        window.addEventListener('storage', updateCartItemCount)
        window.addEventListener('itemAddedToCart', updateCartItemCount)
        return () => {
            window.removeEventListener('storage', updateCartItemCount)
            window.removeEventListener('itemAddedToCart', updateCartItemCount)
        }
    }, [discountEnabled])

    const content = (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-safe pb-20 lg:pb-safe">
            {/* Example Store Banner */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 shadow-sm mb-4">
                <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-blue-900 mb-1">
                            🛍️ BOUTIQUE EXEMPLE
                        </h3>
                        <p className="text-sm text-blue-800">
                            Cette boutique est un exemple pour vous montrer à quoi ressemble une boutique étudiante. Vous pouvez parcourir les produits et ajouter des articles au panier, mais les commandes ne peuvent pas être passées dans cette boutique exemple.
                        </p>
                    </div>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-4 sm:mb-6 lg:mb-8"
            >
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">{storeName}</h1>
                {storeDescription && (
                    <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                        {storeDescription}
                    </p>
                )}
            </motion.div>

            {/* Urgency Banner - Date limite */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-3 sm:p-4 shadow-lg"
            >
                <div className="flex items-center gap-2 sm:gap-3">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm sm:text-base font-semibold">⏰ Date limite : {new Date(orderDeadline).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        {deliveryDate && (
                            <p className="text-sm sm:text-base opacity-90 mt-0.5">📦 Livraison le {new Date(deliveryDate).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}</p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Discount Progress Banner */}
            {discountEnabled && cartItemCount > 0 && cartItemCount < 6 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4 sm:p-5 shadow-lg"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-white/20 rounded-full p-2">
                            <Percent className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-base sm:text-lg font-bold">
                                {6 - cartItemCount} produit{6 - cartItemCount > 1 ? 's' : ''} de plus pour obtenir 5% de réduction!
                            </p>
                            <p className="text-xs sm:text-sm opacity-90 mt-1">Économisez sur votre commande totale</p>
                        </div>
                    </div>
                    <Progress value={discountProgress} className="h-3 bg-white/30" />
                </motion.div>
            )}

            {/* Success Banner - Discount Active */}
            {discountEnabled && cartItemCount >= 6 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4 sm:p-5 shadow-lg"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-full p-2">
                            <Percent className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-base sm:text-lg font-bold">🎉 Félicitations! Vous bénéficiez de 5% de réduction!</p>
                            <p className="text-xs sm:text-sm opacity-90 mt-1">Votre réduction sera appliquée automatiquement</p>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                <div className="lg:col-span-2 order-2 lg:order-1">
                    <div className="overflow-y-auto">
                        <ProductList
                            schoolId={null}
                            campaignId={null}
                            storeId="exemple"
                            isReady={true}
                            initialProducts={initialProducts}
                        />
                    </div>

                    {/* Mobile: StoreInfoCard and ShareSection below products */}
                    <div className="lg:hidden mt-6 mb-24 sm:mb-28 space-y-4">
                        <StoreInfoCard
                            orderDeadline={orderDeadline}
                            deliveryDate={deliveryDate}
                            ownerName={ownerName}
                            ownerEmail={ownerEmail}
                            ownerPhone={ownerPhone}
                            schoolName={schoolName}
                        />
                        <ShareSection
                            isOwner={false}
                            ownerName={ownerName}
                            deliveryDate={deliveryDate}
                            schoolName={schoolName}
                        />
                    </div>
                </div>

                {/* Desktop sidebar */}
                <div className="lg:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8 order-1 lg:order-2">
                    {/* Desktop Cart - hidden on mobile */}
                    <div className="hidden lg:block">
                        <Cart
                            id="exemple"
                            campaignId={null}
                            schoolId={null}
                            campaignData={null}
                            initialDeliveryOptions={[]}
                            isExample={true}
                        />
                    </div>

                    {/* Desktop: StoreInfoCard and ShareSection */}
                    <div className="hidden lg:block space-y-4 sm:space-y-6 lg:space-y-8">
                        <StoreInfoCard
                            orderDeadline={orderDeadline}
                            deliveryDate={deliveryDate}
                            ownerName={ownerName}
                            ownerEmail={ownerEmail}
                            ownerPhone={ownerPhone}
                            schoolName={schoolName}
                        />
                        <ShareSection
                            isOwner={false}
                            ownerName={ownerName}
                            deliveryDate={deliveryDate}
                            schoolName={schoolName}
                        />
                    </div>
                </div>

                {/* Mobile Sticky Cart */}
                <StickyCartMobile
                    id="exemple"
                    campaignId={null}
                    schoolId={null}
                    campaignData={null}
                    initialDeliveryOptions={[]}
                    onCheckoutOpen={() => { }}
                    isExample={true}
                />
            </div>
        </div>
    )

    return <Layout>{content}</Layout>
}

export async function getServerSideProps() {
    try {
        await dbConnect()

        // Fetch products
        const productDocs = await Product.find({})
            .sort({ order: 1, createdAt: -1 })
            .limit(100)
            .lean()

        const products = productDocs
            .filter(product => product && product._id && product.name)
            .map(product => ({
                id: product._id.toString(),
                name: sanitizeHtml(String(product.name || '')),
                description: sanitizeHtml(String(product.description || '')),
                price: Number(product.price) || 0,
                originalPrice: Number(product.price) || 0,
                cost: Number(product.cost) || 0,
                image: sanitizeHtml(String(product.image || '')),
                ingredientsImage: sanitizeHtml(String(product.ingredientsImage || '')),
                nutritionImage: sanitizeHtml(String(product.nutritionImage || '')),
                isDefault: Boolean(product.isDefault),
                productId: String(product.productId || ''),
                order: Number(product.order) || 0,
                hasCustomPrice: false
            }))

        return {
            props: {
                initialProducts: products
            }
        }
    } catch (error) {
        console.error('Error in getServerSideProps:', error)
        return {
            props: {
                initialProducts: []
            }
        }
    }
}

