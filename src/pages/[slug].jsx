// pages/[slug].jsx - Route for store slugs at root level (e.g., /marie-tremblay)
import Boutique from './boutique/[id]'
import dbConnect from '../lib/mongodb'
import Store from '../models/Store'
import User from '../models/User'
import Campaign from '../models/Campaign'
import School from '../models/School'
import Product from '../models/Product'
import mongoose from 'mongoose'
import sanitizeHtml from 'sanitize-html'

// List of reserved routes that should not be treated as store slugs
const RESERVED_ROUTES = [
    'dashboard',
    'connexion',
    'inscription',
    'inscription-manager',
    'email-verification',
    'email-verified',
    'email-verification-error',
    'resend-verification',
    'forgot-password',
    'reset-password',
    'test-email',
    'test-inscription',
    'detail',
    'api',
    '_app',
    '_document',
    'favicon.ico',
    'boutique'
]

export default function StoreSlugPage({ initialStoreData, initialProducts }) {
    // Pass props to Boutique component
    return <Boutique initialStoreData={initialStoreData} initialProducts={initialProducts} />
}

export async function getServerSideProps(context) {
    const { slug } = context.params

    // Check if it's a reserved route
    if (slug && RESERVED_ROUTES.includes(slug.toLowerCase())) {
        // Return empty props and let Next.js handle the route normally
        return { props: {} }
    }

    try {
        await dbConnect()

        // Find store by slug
        const store = await Store.findOne({ slug: slug })
        if (!store && mongoose.Types.ObjectId.isValid(slug)) {
            // Fallback: try as ID
            const storeById = await Store.findById(slug)
            if (storeById) {
                return { notFound: true } // Redirect to /boutique/[id] route instead
            }
        }

        if (!store) {
            return { notFound: true }
        }

        const rawStore = store.toObject ? store.toObject() : store
        const campaignIdFromRaw = rawStore.campaignId || store.campaignId

        // Get owner
        const owner = await User.findById(store.user)
        if (!owner) {
            return { notFound: true }
        }

        // Get campaignId
        let campaignIdToUse = null
        if (campaignIdFromRaw) {
            if (mongoose.Types.ObjectId.isValid(campaignIdFromRaw)) {
                campaignIdToUse = campaignIdFromRaw.toString()
            } else {
                campaignIdToUse = campaignIdFromRaw
            }
        }

        // Get campaign data and school info
        let campaignData = null
        let schoolName = null
        let schoolIdToUse = null

        if (campaignIdToUse) {
            const campaign = await Campaign.findById(campaignIdToUse).populate('school').lean()
            if (campaign) {
                campaignData = {
                    endDate: campaign.endDate ? new Date(campaign.endDate).toISOString() : null,
                    deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString() : null,
                    status: campaign.status,
                    isActive: campaign.isActive,
                    donationsForStudents: campaign.donationsForStudents || {
                        enabled: true,
                        presets: [0, 2, 5]
                    },
                    donationsForSchool: campaign.donationsForSchool || {
                        enabled: true,
                        presets: [0, 2, 5]
                    },
                    organizationType: campaign.organizationType || 'school'
                }

                if (campaign.school) {
                    schoolIdToUse = campaign.school._id.toString()
                    schoolName = campaign.school.name
                }
            }
        }

        // Fallback to owner.school
        if (!schoolIdToUse && owner.school) {
            schoolIdToUse = owner.school.toString()
            if (!schoolName) {
                const school = await School.findById(owner.school).lean()
                if (school) {
                    schoolName = school.name
                }
            }
        }

        // Get owner phone
        const ownerPhone = owner.role === 'school_manager'
            ? (owner.schoolManagerInfo?.telephone || owner.schoolManagerInfo?.cellulaire || '')
            : (owner.parentInfo?.telephone || '')

        // Fetch products with custom pricing
        let products = []
        if (campaignIdToUse) {
            const activeCampaign = await Campaign.findById(campaignIdToUse)
                .populate('customPrices.productId', '_id')
                .lean()

            const productDocs = await Product.find({})
                .sort({ order: 1, createdAt: -1 })
                .limit(100)
                .lean()

            products = productDocs
                .filter(product => product && product._id && product.name)
                .map(product => {
                    let finalPrice = product.price
                    let hasCustomPrice = false

                    if (activeCampaign?.customPrices?.length > 0) {
                        const productIdStr = product._id.toString()
                        const customPrice = activeCampaign.customPrices.find(cp => {
                            if (!cp.productId) return false
                            let cpProductId = null
                            if (cp.productId._id) {
                                cpProductId = cp.productId._id.toString()
                            } else if (cp.productId.toString && typeof cp.productId.toString === 'function') {
                                cpProductId = cp.productId.toString()
                            } else if (typeof cp.productId === 'string') {
                                cpProductId = cp.productId
                            } else {
                                try {
                                    cpProductId = String(cp.productId)
                                } catch (e) {
                                    return false
                                }
                            }
                            return cpProductId === productIdStr
                        })

                        if (customPrice && customPrice.price !== undefined && customPrice.price !== null) {
                            finalPrice = customPrice.price
                            hasCustomPrice = true
                        }
                    }

                    const productData = {
                        id: product._id.toString(),
                        name: sanitizeHtml(String(product.name || '')),
                        description: sanitizeHtml(String(product.description || '')),
                        price: Number(finalPrice) || 0,
                        originalPrice: Number(product.price) || 0,
                        cost: Number(product.cost) || 0,
                        image: sanitizeHtml(String(product.image || '')),
                        ingredientsImage: sanitizeHtml(String(product.ingredientsImage || '')),
                        nutritionImage: sanitizeHtml(String(product.nutritionImage || '')),
                        isDefault: Boolean(product.isDefault),
                        productId: String(product.productId || ''),
                        order: Number(product.order) || 0,
                        hasCustomPrice: hasCustomPrice
                    }

                    // Debug: Log products with ingredient/nutrition images
                    if (productData.ingredientsImage || productData.nutritionImage) {
                        console.log(`[Slug SSR] Product "${productData.name}" has images:`, {
                            ingredientsImage: productData.ingredientsImage,
                            nutritionImage: productData.nutritionImage
                        })
                    }

                    return productData
                })
        } else {
            // Fetch products without custom pricing
            const productDocs = await Product.find({})
                .sort({ order: 1, createdAt: -1 })
                .limit(100)
                .lean()

            products = productDocs
                .filter(product => product && product._id && product.name)
                .map(product => {
                    const productData = {
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
                    }

                    // Debug: Log products with ingredient/nutrition images
                    if (productData.ingredientsImage || productData.nutritionImage) {
                        console.log(`[Slug SSR] Product "${productData.name}" has images:`, {
                            ingredientsImage: productData.ingredientsImage,
                            nutritionImage: productData.nutritionImage
                        })
                    }

                    return productData
                })
        }

        // Normalize deliveryOptions (similar to /api/stores/[id])
        const normalizeDeliveryOptions = (options) => {
            if (!options || !Array.isArray(options) || options.length === 0) {
                return [
                    { name: 'Travail', enabled: true },
                    { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                    { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                    { name: 'Autre', enabled: true }
                ];
            }

            // If old format (strings), migrate
            if (typeof options[0] === 'string') {
                const migrationMap = {
                    'Travail': { name: 'Travail', enabled: true },
                    'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                    'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                    'Autre': { name: 'Autre', enabled: true }
                };
                return options.map(opt => {
                    if (typeof opt === 'string') {
                        return migrationMap[opt] || { name: opt, enabled: true };
                    }
                    return opt;
                });
            }

            // Already in new format - filter invalid options
            const validOptions = options.filter(opt => opt && opt.name);
            if (validOptions.length === 0) {
                return [
                    { name: 'Travail', enabled: true },
                    { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                    { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                    { name: 'Autre', enabled: true }
                ];
            }

            // Ensure all options have required fields
            return validOptions.map(opt => ({
                name: opt.name || 'Autre',
                enabled: opt.enabled !== undefined ? opt.enabled : true,
                pickupAddress: opt.pickupAddress || '',
                deliveryRadius: opt.deliveryRadius || ''
            }));
        };

        const normalizedDeliveryOptions = normalizeDeliveryOptions(store.deliveryOptions);

        return {
            props: {
                initialStoreData: {
                    name: store.name,
                    description: store.description,
                    ownerId: store.user.toString(),
                    ownerName: owner.name,
                    ownerEmail: owner.email,
                    ownerPhone: ownerPhone,
                    ownerSchool: schoolIdToUse,
                    campaignId: campaignIdToUse,
                    slug: store.slug || null,
                    campaign: campaignData,
                    schoolName: schoolName,
                    deliveryOptions: normalizedDeliveryOptions
                },
                initialProducts: products
            }
        }
    } catch (error) {
        console.error('Error in getServerSideProps ([slug]):', error)
        return { notFound: true }
    }
}

