import dbConnect from '../../../lib/mongodb';
import Supplier from '../../../models/Supplier';
import Campaign from '../../../models/Campaign';
import Product from '../../../models/Product';
import Order from '../../../models/Order';
import Review from '../../../models/Review';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            await dbConnect();

            // Get query parameters
            const { status, approved, schoolId, id } = req.query;

            // If id is provided, return single supplier
            if (id) {
                const mongoose = (await import('mongoose')).default;
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return res.status(400).json({ message: 'Invalid supplier ID' });
                }

                const supplier = await Supplier.findById(id)
                    .select('name email phone address ville codePostal logo description status approved certifications website deliverySettings pricingSettings')
                    .lean();

                if (!supplier) {
                    return res.status(404).json({ message: 'Supplier not found' });
                }

                // Convert logo to URL if it's a Cloudinary public_id
                let logoUrl = supplier.logo;
                if (supplier.logo) {
                    if (supplier.logo.startsWith('http')) {
                        // Already a full URL
                        logoUrl = supplier.logo;
                    } else if (supplier.logo.startsWith('supplier-logos/') || supplier.logo.includes('cloudinary.com')) {
                        // It's a Cloudinary public_id, construct URL
                        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
                        if (cloudName && !supplier.logo.startsWith('http')) {
                            // Cloudinary URLs don't need file extension - it auto-detects
                            logoUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${supplier.logo}`;
                        } else {
                            // Already a URL or cloud name not configured
                            logoUrl = supplier.logo;
                        }
                    } else if (supplier.logo.startsWith('/uploads')) {
                        // Local file path
                        logoUrl = supplier.logo;
                    }
                }

                return res.status(200).json({
                    supplier: {
                        _id: supplier._id.toString(),
                        name: supplier.name,
                        email: supplier.companyEmail || supplier.email,
                        phone: supplier.phone,
                        address: supplier.address,
                        ville: supplier.ville,
                        codePostal: supplier.codePostal,
                        logo: logoUrl, // Return the converted URL
                        description: supplier.description,
                        status: supplier.status,
                        approved: supplier.approved,
                        certifications: supplier.certifications || [],
                        website: supplier.website,
                        deliverySettings: supplier.deliverySettings || {
                            minimumDeliveryDays: 21
                        },
                        pricingSettings: supplier.pricingSettings || {
                            markup: 5,
                            handlesShipping: false
                        }
                    }
                });
            }

            // Build query
            const query = {};
            if (status) {
                query.status = status;
            }
            if (approved !== undefined) {
                query.approved = approved === 'true';
            }

            // Only return active and approved suppliers for public listing
            if (!status && approved === undefined) {
                query.status = 'active';
                query.approved = true;
                // Only show suppliers that opted in to be visible AND have completed onboarding
                query.visibleInList = true;
            }

            const suppliers = await Supplier.find(query)
                .select('name email phone address ville codePostal logo description status approved certifications website visibleInList')
                .sort({ name: 1 })
                .lean();

            // Filter suppliers by onboarding completion
            // Get SupplierManager to find users associated with each supplier
            const SupplierManager = (await import('../../../models/SupplierManager')).default;
            const User = (await import('../../../models/User')).default;

            const suppliersWithOnboardingCheck = await Promise.all(
                suppliers.map(async (supplier) => {
                    // Find users associated with this supplier
                    const supplierManagers = await SupplierManager.find({
                        supplier: supplier._id,
                        status: 'active'
                    }).select('user').lean();

                    if (supplierManagers.length === 0) {
                        // No users associated, don't show
                        return null;
                    }

                    // Check if at least one user has completed onboarding
                    const userIds = supplierManagers.map(sm => sm.user);
                    const users = await User.find({
                        _id: { $in: userIds }
                    }).select('supplierOnboardingProgress').lean();

                    const hasCompletedOnboarding = users.some(user => {
                        if (!user.supplierOnboardingProgress) return false;
                        const progress = user.supplierOnboardingProgress;
                        // Check if both required steps are completed
                        return progress.productCatalog === true && progress.settings === true;
                    });

                    // Only return supplier if onboarding is completed
                    if (!hasCompletedOnboarding) {
                        return null;
                    }

                    return supplier;
                })
            );

            // Filter out null values
            const filteredSuppliers = suppliersWithOnboardingCheck.filter(s => s !== null);

            // Get school info for distance calculation if provided
            let schoolPostalCode = null;
            if (schoolId) {
                const School = (await import('../../../models/School')).default;
                const school = await School.findById(schoolId).select('codePostal ville').lean();
                if (school) {
                    schoolPostalCode = school.codePostal;
                }
            }

            // Calculate metrics for each supplier
            const suppliersWithMetrics = await Promise.all(
                filteredSuppliers.map(async (supplier) => {
                    // Get all campaigns for this supplier
                    const campaigns = await Campaign.find({ supplier: supplier._id })
                        .select('_id status financialGoal')
                        .lean();

                    // Get all products for this supplier to calculate average profit margin
                    const products = await Product.find({ supplier: supplier._id })
                        .select('price cost')
                        .lean();

                    // Calculate average profit margin
                    // IMPORTANT: p.price is the ROUNDED price (source of truth) for schools
                    // p.cost is also rounded. Use these values directly.
                    let averageProfitMargin = null;
                    if (products.length > 0) {
                        const margins = products
                            .filter(p => p.price && p.cost && p.price > 0)
                            // p.price and p.cost are already rounded - use them directly
                            .map(p => ((p.price - p.cost) / p.price) * 100);

                        if (margins.length > 0) {
                            averageProfitMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
                        }
                    }

                    // Calculate total campaigns
                    const totalCampaigns = campaigns.length;

                    // Calculate average rating and review count from actual reviews
                    const reviewStats = await Review.aggregate([
                        { $match: { supplier: supplier._id, isVisible: true } },
                        {
                            $group: {
                                _id: null,
                                averageRating: { $avg: '$rating' },
                                reviewCount: { $sum: 1 }
                            }
                        }
                    ]);

                    const averageRating = reviewStats[0]?.averageRating || 0;
                    const reviewCount = reviewStats[0]?.reviewCount || 0;

                    // Calculate distance (simplified - using postal code)
                    let distance = null;
                    if (schoolPostalCode && supplier.codePostal) {
                        // Simple distance estimation based on postal code prefix
                        // In production, use a geocoding service
                        const schoolPrefix = schoolPostalCode.substring(0, 3);
                        const supplierPrefix = supplier.codePostal.substring(0, 3);

                        if (schoolPrefix === supplierPrefix) {
                            distance = 0.5; // Same area
                        } else {
                            // Rough estimate: different postal codes = ~50km base + variation
                            distance = 50 + Math.abs(parseInt(schoolPrefix) - parseInt(supplierPrefix)) * 2;
                        }
                    }

                    // Convert logo to URL if it's a Cloudinary public_id
                    let logoUrl = supplier.logo;
                    if (supplier.logo) {
                        if (supplier.logo.startsWith('http')) {
                            // Already a full URL
                            logoUrl = supplier.logo;
                        } else if (supplier.logo.startsWith('supplier-logos/') || supplier.logo.includes('cloudinary.com')) {
                            // It's a Cloudinary public_id, construct URL
                            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
                            if (cloudName && !supplier.logo.startsWith('http')) {
                                // Cloudinary URLs don't need file extension - it auto-detects
                                logoUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${supplier.logo}`;
                            } else {
                                // Already a URL or cloud name not configured
                                logoUrl = supplier.logo;
                            }
                        } else if (supplier.logo.startsWith('/uploads')) {
                            // Local file path
                            logoUrl = supplier.logo;
                        }
                    }

                    return {
                        _id: supplier._id.toString(),
                        name: supplier.name,
                        email: supplier.companyEmail || supplier.email,
                        phone: supplier.phone,
                        address: supplier.address,
                        ville: supplier.ville,
                        codePostal: supplier.codePostal,
                        logo: logoUrl, // Return the converted URL
                        description: supplier.description,
                        status: supplier.status,
                        approved: supplier.approved,
                        certifications: supplier.certifications || [],
                        website: supplier.website,
                        // Metrics
                        averageProfitMargin,
                        totalCampaigns,
                        averageRating,
                        reviewCount,
                        distance
                    };
                })
            );

            res.status(200).json({
                suppliers: suppliersWithMetrics
            });
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des fournisseurs', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ message: 'Méthode non autorisée' });
    }
}


