import dbConnect from './mongodb';
import User from '../models/User';
import Campaign from '../models/Campaign';
import School from '../models/School';
import Store from '../models/Store';
import Order from '../models/Order';
import Product from '../models/Product';
import mongoose from 'mongoose';

/**
 * Shared utility to get dashboard data server-side
 * Returns campaign context, store info, school data, and campaign data
 */
export async function getDashboardSSRData(session) {
    if (!session || !session.user) {
        return null;
    }

    await dbConnect();

    // Get user with campaigns populated
    const user = await User.findById(session.user.id)
        .populate('campaigns.campaignId')
        .populate('campaigns.schoolId', 'name code logo')
        .lean();

    if (!user) {
        return null;
    }

    // Get campaign context
    const getUserCampaignContext = (userDoc) => {
        if (!userDoc.campaigns || userDoc.campaigns.length === 0) {
            if (userDoc.school) {
                return {
                    mode: 'legacy',
                    schoolId: userDoc.school.toString(),
                    activeCampaignId: `legacy-${userDoc.school}`,
                    campaigns: [],
                    objectifPersonnel: userDoc.objectifPersonnel
                };
            }
            return {
                mode: 'none',
                activeCampaignId: null,
                campaigns: []
            };
        }

        const activeCampaignId = userDoc.activeCampaignId
            ? userDoc.activeCampaignId.toString()
            : (userDoc.campaigns[0]?.campaignId?._id?.toString() || userDoc.campaigns[0]?.campaignId?.toString());

        return {
            mode: 'campaign',
            activeCampaignId: activeCampaignId,
            campaigns: userDoc.campaigns.map(c => ({
                campaignId: c.campaignId?._id?.toString() || c.campaignId?.toString(),
                schoolId: c.schoolId?._id?.toString() || c.schoolId?.toString()
            }))
        };
    };

    const campaignContext = getUserCampaignContext(user);

    // Helper function to convert Cloudinary public_id to URL
    const getLogoUrl = (logo) => {
        if (!logo) return null;
        if (logo.startsWith('http')) return logo;
        if (logo.startsWith('school-logo/')) {
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
            return `https://res.cloudinary.com/${cloudName}/image/upload/${logo}.png`;
        }
        return null;
    };

    // Format campaigns for response
    let formattedCampaigns = [];
    let initialSchoolData = null;
    let initialCampaignData = null;
    let initialStoreInfo = null;

    if (campaignContext.mode === 'legacy') {
        const school = await School.findById(campaignContext.schoolId).lean();
        if (school) {
            formattedCampaigns = [{
                _id: `legacy-${school._id}`,
                campaignNumber: 1,
                campaignCode: `${school.code}-C1`,
                school: {
                    _id: school._id.toString(),
                    name: school.name,
                    code: school.code,
                    logo: getLogoUrl(school.logo)
                },
                status: 'legacy',
                isActive: true,
                objectifPersonnel: campaignContext.objectifPersonnel,
                joinedAt: user.createdAt || new Date(),
                isLegacy: true
            }];
            initialSchoolData = {
                _id: school._id.toString(),
                name: school.name,
                address: school.address,
                ville: school.ville,
                codePostal: school.codePostal,
                organizationType: school.organizationType || 'school',
                split: school.split || {
                    studentBenefit: 85.6,
                    organizationBenefit: 9.4,
                    raffleBenefit: 5.0
                }
            };
        }
    } else if (campaignContext.mode === 'campaign' && campaignContext.campaigns.length > 0) {
        formattedCampaigns = user.campaigns.map(campaignEntry => {
            const campaign = campaignEntry.campaignId;
            const school = campaignEntry.schoolId;

            return {
                _id: campaign._id.toString(),
                campaignNumber: campaign.campaignNumber,
                campaignCode: campaign.campaignCode,
                school: {
                    _id: school._id.toString(),
                    name: school.name,
                    code: school.code,
                    logo: getLogoUrl(school.logo)
                },
                startDate: campaign.startDate ? new Date(campaign.startDate).toISOString() : null,
                endDate: campaign.endDate ? new Date(campaign.endDate).toISOString() : null,
                deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString() : null,
                financialGoal: campaign.financialGoal,
                status: campaign.status,
                isActive: campaign.isActive,
                objectifPersonnel: campaignEntry.objectifPersonnel,
                joinedAt: campaignEntry.joinedAt ? new Date(campaignEntry.joinedAt).toISOString() : null,
                isActiveCampaign: campaignContext.activeCampaignId === campaign._id.toString()
            };
        });

        // Get active campaign data
        if (campaignContext.activeCampaignId) {
            const activeCampaign = await Campaign.findById(campaignContext.activeCampaignId).lean();
            if (activeCampaign) {
                const formatProfitSplits = (splits = []) =>
                    splits.map(split => ({
                        productId: split.productId
                            ? (typeof split.productId === 'string'
                                ? split.productId
                                : split.productId.toString())
                            : null,
                        studentCash: split.studentCash !== undefined && split.studentCash !== null ? Number(split.studentCash) : null,
                        studentSchoolAccount: split.studentSchoolAccount !== undefined && split.studentSchoolAccount !== null ? Number(split.studentSchoolAccount) : null,
                        schoolProject: split.schoolProject !== undefined && split.schoolProject !== null ? Number(split.schoolProject) : null,
                        raffle: split.raffle !== undefined && split.raffle !== null ? Number(split.raffle) : null
                    })).filter(split => split.productId);

                const formatCustomPrices = (prices = []) =>
                    prices.map(entry => ({
                        productId: entry.productId
                            ? (typeof entry.productId === 'string'
                                ? entry.productId
                                : entry.productId.toString())
                            : null,
                        price: entry.price !== undefined && entry.price !== null ? Number(entry.price) : null
                    })).filter(entry => entry.productId && entry.price !== null);

                initialCampaignData = {
                    _id: activeCampaign._id.toString(),
                    deliveryDate: activeCampaign.deliveryDate ? new Date(activeCampaign.deliveryDate).toISOString() : null,
                    endDate: activeCampaign.endDate ? new Date(activeCampaign.endDate).toISOString() : null,
                    status: activeCampaign.status,
                    isActive: activeCampaign.isActive,
                    organizationType: activeCampaign.organizationType || 'school',
                    profitSplitType: activeCampaign.profitSplitType || 'absolute',
                    profitSplits: formatProfitSplits(activeCampaign.profitSplits),
                    customPrices: formatCustomPrices(activeCampaign.customPrices),
                    donationsForStudents: activeCampaign.donationsForStudents || null,
                    donationsForSchool: activeCampaign.donationsForSchool || null,
                    profitSplitLocked: !!activeCampaign.profitSplitLocked
                };

                // Get school data
                if (activeCampaign.school) {
                    const school = await School.findById(activeCampaign.school).lean();
                    if (school) {
                        initialSchoolData = {
                            _id: school._id.toString(),
                            name: school.name,
                            address: school.address,
                            ville: school.ville,
                            codePostal: school.codePostal,
                            organizationType: school.organizationType || 'school',
                            split: school.split || {
                                studentBenefit: 85.6,
                                organizationBenefit: 9.4,
                                raffleBenefit: 5.0
                            }
                        };
                    }
                }

                // Get store info with full details (similar to /api/stores/[id])
                const normalizedCampaignId = mongoose.Types.ObjectId.isValid(campaignContext.activeCampaignId)
                    ? new mongoose.Types.ObjectId(campaignContext.activeCampaignId)
                    : campaignContext.activeCampaignId;

                const store = await Store.findOne({
                    user: session.user.id,
                    campaignId: normalizedCampaignId
                }).lean();

                if (store) {
                    // Get owner (user) details
                    const owner = await User.findById(store.user).lean();

                    // Get school name from campaign or owner
                    let schoolName = null;
                    let schoolIdToUse = null;

                    if (activeCampaign.school) {
                        schoolIdToUse = activeCampaign.school.toString();
                        if (initialSchoolData) {
                            schoolName = initialSchoolData.name;
                        }
                    } else if (owner?.school) {
                        schoolIdToUse = owner.school.toString();
                        if (!schoolName) {
                            const school = await School.findById(owner.school).lean();
                            if (school) {
                                schoolName = school.name;
                            }
                        }
                    }

                    // Get owner phone number
                    const ownerPhone = owner?.role === 'school_manager'
                        ? (owner.schoolManagerInfo?.telephone || owner.schoolManagerInfo?.cellulaire || '')
                        : (owner?.parentInfo?.telephone || '');

                    // Build campaign data object
                    const campaignDataForStore = {
                        endDate: initialCampaignData?.endDate || null,
                        deliveryDate: initialCampaignData?.deliveryDate || null,
                        status: initialCampaignData?.status || null,
                        isActive: initialCampaignData?.isActive || null,
                        schoolId: schoolIdToUse || null
                    };

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

                    initialStoreInfo = {
                        storeId: store._id.toString(),
                        slug: store.slug || null,
                        name: store.name || '',
                        description: store.description || '',
                        autoDeposit: store.autoDeposit || false,
                        discountEnabled: store.discountEnabled !== false, // Default to true
                        ownerId: store.user?.toString() || store.user,
                        ownerEmail: owner?.email || '',
                        ownerName: owner?.name || '',
                        ownerPhone: ownerPhone,
                        ownerSchool: schoolIdToUse || null,
                        campaignId: campaignContext.activeCampaignId || null,
                        campaign: campaignDataForStore,
                        schoolName: schoolName || null,
                        deliveryOptions: normalizedDeliveryOptions
                    };
                }
            }
        }
    }

    return {
        initialCampaignContext: {
            campaigns: formattedCampaigns,
            activeCampaignId: campaignContext.activeCampaignId,
            mode: campaignContext.mode,
            initialStoreInfo: initialStoreInfo || null
        },
        initialStoreInfo: initialStoreInfo || null,
        initialSchoolData: initialSchoolData || null,
        initialCampaignData: initialCampaignData || null
    };
}

/**
 * Fetch orders for a user server-side
 */
export async function getOrdersSSR(session, campaignId = null) {
    if (!session || !session.user) {
        return [];
    }

    await dbConnect();

    const userId = session.user.id;

    // Find all stores belonging to this user
    const userStores = await Store.find({ user: userId }).lean();
    const storeIds = userStores.map(store => store._id);

    const orConditions = [
        { user: userId },
    ];

    if (storeIds.length > 0) {
        orConditions.push({ store: { $in: storeIds } });
    }

    const queryConditions = { $or: orConditions };

    // Add campaign filter if campaignId is provided
    if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
        queryConditions.$and = [
            { $or: orConditions },
            { campaignId: new mongoose.Types.ObjectId(campaignId) }
        ];
        delete queryConditions.$or;
    }

    const orders = await Order.find(queryConditions)
        .populate('store', 'discountEnabled')
        .sort({ createdAt: -1 })
        .lean();

    // Serialize dates and ObjectIds - ensure all nested objects are properly serialized
    return orders.map(order => {
        // Explicitly serialize only the fields we need
        const serializedOrder = {
            _id: order._id.toString(),
            user: order.user?.toString() || order.user,
            store: typeof order.store === 'object' && order.store?._id
                ? order.store._id.toString()
                : (order.store?.toString() || order.store),
            school: order.school || '',
            campaignId: order.campaignId?.toString() || order.campaignId,
            campaignNumber: order.campaignNumber || null,
            totalAmount: order.totalAmount || 0,
            customerName: order.customerName || '',
            customerEmail: order.customerEmail || '',
            phoneNumber: order.phoneNumber || '',
            status: order.status || 'En attente',
            createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
            orderId: order.orderId || null,
            studentDonation: order.studentDonation || 0,
            schoolDonation: order.schoolDonation || 0,
            studentDonationSplit: order.studentDonationSplit || {
                studentAccount: 0,
                studentCash: 0
            },
            tip: order.tip || 0,
            tipBreakdown: order.tipBreakdown || {
                studentCash: 0,
                studentSchoolAccount: 0,
                schoolProject: 0
            },
            discount: order.discount || 0,
            isTest: order.isTest || false,
            distributionNotes: order.distributionNotes || '',
            deliveryOption: order.deliveryOption || '',
            customDeliveryOption: order.customDeliveryOption || '',
            customerDeliveryAddress: order.customerDeliveryAddress || '',
            products: order.products?.map(product => {
                // Handle product subdocument - explicitly serialize each field
                const serializedProduct = {
                    quantity: product.quantity || 0,
                    productName: product.productName || '',
                    productCost: product.productCost || 0,
                    productPrice: product.productPrice || 0,
                    product: product.product?.toString() || product.product
                };

                // Only include _id if it exists (subdocuments have _id)
                if (product._id) {
                    serializedProduct._id = product._id.toString();
                }

                return serializedProduct;
            }) || []
        };

        return serializedOrder;
    });
}

/**
 * Fetch products server-side
 */
export async function getProductsSSR() {
    await dbConnect();

    const products = await Product.find({})
        .sort({ order: 1, createdAt: -1 })
        .limit(100)
        .lean();

    return products.map(product => ({
        id: product._id.toString(),
        name: product.name || '',
        description: product.description || '',
        price: Number(product.price) || 0,
        cost: Number(product.cost) || 0,
        image: product.image || '',
        isDefault: Boolean(product.isDefault),
        productId: String(product.productId || ''),
        order: Number(product.order) || 0,
        ingredientsImage: product.ingredientsImage || '',
        nutritionImage: product.nutritionImage || ''
    }));
}

/**
 * Fetch detail page data server-side (campaign, school, products)
 */
export async function getDetailPageSSR(session) {
    if (!session || !session.user) {
        return {
            campaignData: null,
            schoolData: null,
            products: [],
            user: null
        };
    }

    await dbConnect();

    try {
        // Get user with campaigns populated
        const user = await User.findById(session.user.id)
            .populate('campaigns.campaignId')
            .populate('campaigns.schoolId', 'name code logo')
            .lean();

        if (!user) {
            return {
                campaignData: null,
                schoolData: null,
                products: [],
                user: null
            };
        }

        // Determine campaign ID
        let campaignId = null;
        let schoolId = null;

        if (user.role === 'student') {
            if (user.activeCampaignId) {
                campaignId = user.activeCampaignId.toString();
            } else if (user.campaigns && user.campaigns.length > 0) {
                const activeCampaignEntry = user.campaigns.find(c => c.isActive) || user.campaigns[0];
                campaignId = activeCampaignEntry?.campaignId?._id?.toString() || activeCampaignEntry?.campaignId?.toString();
                schoolId = activeCampaignEntry?.schoolId?._id?.toString() || activeCampaignEntry?.schoolId?.toString();
            } else if (user.school) {
                schoolId = user.school.toString();
            }
        } else if (user.role === 'school_manager') {
            const managerSchoolId = user.schoolManagerInfo?.organisme?._id?.toString() || user.schoolManagerInfo?.organisme?.toString();
            if (user.activeCampaignId) {
                campaignId = user.activeCampaignId.toString();
            } else if (managerSchoolId) {
                const school = await School.findById(managerSchoolId).lean();
                if (school?.activeCampaignId) {
                    campaignId = school.activeCampaignId.toString();
                }
                schoolId = managerSchoolId;
            }
        }

        // Fetch campaign data
        let campaignData = null;
        let campaignSchoolData = null;

        if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
            campaignData = await Campaign.findById(campaignId)
                .populate('customPrices.productId', 'name price cost image')
                .populate('profitSplits.productId', 'name')
                .lean();

            if (campaignData?.school) {
                const campaignSchoolId = campaignData.school._id?.toString() || campaignData.school?.toString();
                campaignSchoolData = await School.findById(campaignSchoolId).lean();
                if (campaignSchoolData) {
                    schoolId = campaignSchoolId;
                }
            }
        }

        // Fallback: fetch current campaign if no campaignId found
        if (!campaignData && schoolId) {
            const school = await School.findById(schoolId).lean();
            if (school?.activeCampaignId) {
                campaignData = await Campaign.findById(school.activeCampaignId)
                    .populate('customPrices.productId', 'name price cost image')
                    .populate('profitSplits.productId', 'name')
                    .lean();
                campaignSchoolData = school;
            }
        }

        // If still no campaign, try to get from user's campaigns
        if (!campaignData && user.campaigns && user.campaigns.length > 0) {
            const firstCampaign = user.campaigns[0];
            const firstCampaignId = firstCampaign?.campaignId?._id?.toString() || firstCampaign?.campaignId?.toString();
            if (firstCampaignId) {
                campaignData = await Campaign.findById(firstCampaignId)
                    .populate('customPrices.productId', 'name price cost image')
                    .populate('profitSplits.productId', 'name')
                    .lean();

                if (campaignData?.school) {
                    const campaignSchoolId = campaignData.school._id?.toString() || campaignData.school?.toString();
                    campaignSchoolData = await School.findById(campaignSchoolId).lean();
                    if (campaignSchoolData) {
                        schoolId = campaignSchoolId;
                    }
                }
            }
        }

        // Get school data (use campaign school if available, otherwise use schoolId)
        let schoolData = campaignSchoolData;
        if (!schoolData && schoolId) {
            schoolData = await School.findById(schoolId).lean();
        }

        // Fetch products
        let products = [];
        if (schoolId) {
            products = await Product.find({ school: schoolId })
                .sort({ order: 1, createdAt: -1 })
                .limit(100)
                .lean();
        }

        // Helper function to convert Cloudinary public_id to URL
        const getLogoUrl = (logo) => {
            if (!logo) return null;
            if (logo.startsWith('http')) return logo;
            if (logo.startsWith('school-logo/')) {
                const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
                return cloudName ? `https://res.cloudinary.com/${cloudName}/image/upload/${logo}.png` : null;
            }
            return null;
        };

        // Serialize all data
        const serializedUser = user ? {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            activeCampaignId: user.activeCampaignId?.toString() || null,
            school: user.school?.toString() || null,
            schoolManagerInfo: user.schoolManagerInfo ? {
                organisme: user.schoolManagerInfo.organisme?.toString() || null
            } : null,
            campaigns: user.campaigns?.map(c => ({
                campaignId: c.campaignId?._id?.toString() || c.campaignId?.toString(),
                schoolId: c.schoolId?._id?.toString() || c.schoolId?.toString(),
                isActive: c.isActive || false
            })) || []
        } : null;

        const serializedCampaign = campaignData ? {
            _id: campaignData._id.toString(),
            campaignNumber: campaignData.campaignNumber,
            campaignCode: campaignData.campaignCode,
            startDate: campaignData.startDate?.toISOString() || null,
            endDate: campaignData.endDate?.toISOString() || null,
            deliveryDate: campaignData.deliveryDate?.toISOString() || null,
            financialGoal: campaignData.financialGoal || null,
            status: campaignData.status,
            isActive: campaignData.isActive,
            profitSplitType: campaignData.profitSplitType,
            customPrices: campaignData.customPrices?.map(cp => ({
                productId: cp.productId?._id?.toString() || cp.productId?.toString(),
                price: cp.price
            })) || [],
            profitSplits: campaignData.profitSplits?.map(ps => ({
                productId: ps.productId?._id?.toString() || ps.productId?.toString(),
                studentCash: ps.studentCash,
                studentSchoolAccount: ps.studentSchoolAccount,
                raffle: ps.raffle,
                schoolProject: ps.schoolProject
            })) || [],
            donationsForStudents: campaignData.donationsForStudents || null,
            donationsForSchool: campaignData.donationsForSchool || null,
            school: campaignData.school?._id?.toString() || campaignData.school?.toString() || null
        } : null;

        const serializedSchool = schoolData ? {
            _id: schoolData._id.toString(),
            name: schoolData.name || '',
            code: schoolData.code || '',
            logo: schoolData.logo ? getLogoUrl(schoolData.logo) : null,
            address: schoolData.address || null,
            ville: schoolData.ville || null,
            codePostal: schoolData.codePostal || null,
            organizationType: schoolData.organizationType || null,
            split: schoolData.split || null,
            isBonus: schoolData.isBonus || false,
            bonuses: schoolData.bonuses?.map(bonus => ({
                _id: bonus._id?.toString() || null,
                salesRange: bonus.salesRange || '',
                bonusPerTart: bonus.bonusPerTart || 0,
                totalBonusRange: bonus.totalBonusRange || ''
            })) || [],
            activeCampaignId: schoolData.activeCampaignId?.toString() || null
        } : null;

        const serializedProducts = products.map(product => ({
            id: product._id.toString(),
            _id: product._id.toString(),
            name: product.name || '',
            description: product.description || '',
            price: Number(product.price) || 0,
            cost: Number(product.cost) || 0,
            image: product.image || '',
            order: Number(product.order) || 0
        }));

        return {
            campaignData: serializedCampaign,
            schoolData: serializedSchool,
            products: serializedProducts,
            user: serializedUser
        };
    } catch (error) {
        console.error('Error fetching detail page SSR:', error);
        return {
            campaignData: null,
            schoolData: null,
            products: [],
            user: null
        };
    }
}

/**
 * Fetch top sellers/leaderboard data server-side
 */
export async function getTopSellersSSR(session, schoolId, campaignId = null) {
    if (!session || !session.user || !schoolId) {
        return {
            topPerformers: [],
            userRank: null,
            userTotalEarnings: '0.00',
            userTotalProductsSold: 0,
            userCategory: 'Noob'
        };
    }

    await dbConnect();

    try {
        // Import campaign helpers (using dynamic import to avoid circular dependencies)
        const { calculateStudentEarnings, getCampaignDataWithFallback } = await import('../utils/campaignHelpers');

        // Fetch the school
        const school = await School.findById(schoolId).lean();
        if (!school) {
            return {
                topPerformers: [],
                userRank: null,
                userTotalEarnings: '0.00',
                userTotalProductsSold: 0,
                userCategory: 'Noob'
            };
        }

        // Fetch all students in the school
        const students = await User.find({
            $or: [
                { school: schoolId, role: 'student' },
                { 'campaigns.schoolId': schoolId, role: 'student' }
            ]
        }).lean();

        if (!students || students.length === 0) {
            return {
                topPerformers: [],
                userRank: null,
                userTotalEarnings: '0.00',
                userTotalProductsSold: 0,
                userCategory: 'Noob'
            };
        }

        // Get campaign data for earnings calculation
        const { campaign, fallbackSplit } = await getCampaignDataWithFallback(schoolId, school, campaignId);

        // Calculate total earnings for each student (filtered by campaign if provided)
        const studentData = await Promise.all(students.map(async (student) => {
            const userId = student._id.toString();

            // Build order query
            const orderQuery = { user: userId };
            if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
                orderQuery.campaignId = new mongoose.Types.ObjectId(campaignId);
            }

            // Get all orders for this student
            const orders = await Order.find(orderQuery).lean();

            // Calculate earnings using campaign helpers
            const totalEarnings = calculateStudentEarnings(orders, campaign, fallbackSplit);

            // Calculate products sold and sales
            let totalProductsSold = 0;
            let totalSales = 0;

            orders.forEach(order => {
                order.products?.forEach(product => {
                    totalSales += (product.productPrice || 0) * (product.quantity || 0);
                    totalProductsSold += product.quantity || 0;
                });
            });

            // Determine category based on earnings (simplified version)
            let category = 'Noob';
            if (totalEarnings >= 3001) category = 'Ultime';
            else if (totalEarnings >= 2001) category = 'Élite';
            else if (totalEarnings >= 1001) category = 'Légende';
            else if (totalEarnings >= 501) category = 'Expert';
            else if (totalEarnings >= 301) category = 'Pro';
            else if (totalEarnings >= 201) category = 'Avancé';
            else if (totalEarnings >= 101) category = 'Avancé';
            else if (totalEarnings >= 51) category = 'Intermédiaire';
            else if (totalEarnings >= 11) category = 'Apprenti';
            else if (totalEarnings >= 1) category = 'Débutant';

            return {
                student,
                totalEarnings,
                totalProductsSold,
                totalSales,
                category
            };
        }));

        // Sort by total earnings (descending), then alphabetically by name
        const sortedStudentData = studentData.sort((a, b) => {
            if (b.totalEarnings !== a.totalEarnings) {
                return b.totalEarnings - a.totalEarnings;
            }
            return a.student.name.localeCompare(b.student.name, 'fr', { sensitivity: 'base' });
        });

        // Get top performers
        const topPerformers = sortedStudentData.map(({ student, totalEarnings, totalProductsSold, totalSales, category }, index) => ({
            _id: student._id.toString(),
            userId: student._id.toString(),
            name: student.name,
            rank: index + 1,
            totalEarnings: totalEarnings.toFixed(2),
            totalProductsSold,
            totalSales: totalSales || 0,
            category
        }));

        // Find the current user's rank and earnings
        const currentUserData = sortedStudentData.find(data => data.student._id.toString() === session.user.id);
        const userRank = currentUserData ? sortedStudentData.findIndex(data => data.student._id.toString() === session.user.id) + 1 : null;

        return {
            topPerformers,
            userRank,
            userTotalEarnings: currentUserData ? currentUserData.totalEarnings.toFixed(2) : '0.00',
            userTotalProductsSold: currentUserData ? currentUserData.totalProductsSold : 0,
            userCategory: currentUserData ? currentUserData.category : 'Noob'
        };
    } catch (error) {
        console.error('Error fetching top sellers SSR:', error);
        return {
            topPerformers: [],
            userRank: null,
            userTotalEarnings: '0.00',
            userTotalProductsSold: 0,
            userCategory: 'Noob'
        };
    }
}
