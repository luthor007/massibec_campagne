import dbConnect from './mongodb';
import User from '../models/User';
import Campaign from '../models/Campaign';
import School from '../models/School';
import Store from '../models/Store';
import Client from '../models/Client';
import Order from '../models/Order';
import Product from '../models/Product';
import SupplierManager from '../models/SupplierManager';
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

    const calculateSalesStatsForStore = async (storeIdentifier) => {
        if (!storeIdentifier) {
            return { total: 0, thisMonth: 0, growth: 0 };
        }

        const normalizedStoreId = typeof storeIdentifier === 'string'
            ? storeIdentifier
            : (storeIdentifier?._id?.toString?.() || storeIdentifier?.toString?.());

        const storeObjectId = normalizedStoreId && mongoose.Types.ObjectId.isValid(normalizedStoreId)
            ? new mongoose.Types.ObjectId(normalizedStoreId)
            : null;

        const storeConditions = [];
        if (normalizedStoreId) {
            storeConditions.push({ storeId: normalizedStoreId });
        }
        if (storeObjectId) {
            storeConditions.push({ store: storeObjectId });
        }

        if (storeConditions.length === 0) {
            return { total: 0, thisMonth: 0, growth: 0 };
        }

        const baseFilter = { $or: storeConditions };

        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const lastMonth = new Date(currentMonth);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const totalOrders = await Order.countDocuments(baseFilter);
        const thisMonthOrders = await Order.countDocuments({
            ...baseFilter,
            createdAt: { $gte: currentMonth }
        });
        const lastMonthOrders = await Order.countDocuments({
            ...baseFilter,
            createdAt: { $gte: lastMonth, $lt: currentMonth }
        });

        const growth = lastMonthOrders > 0
            ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100)
            : (thisMonthOrders > 0 ? 100 : 0);

        return {
            total: totalOrders,
            thisMonth: thisMonthOrders,
            growth
        };
    };

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
    let initialClients = [];
    let initialSalesStats = { total: 0, thisMonth: 0, growth: 0 };

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
                    let ownerPhone = '';
                    if (owner?.role === 'school_manager') {
                        ownerPhone = owner.schoolManagerInfo?.telephone || owner.schoolManagerInfo?.cellulaire || '';
                    } else if (owner?.role === 'supplier') {
                        // For suppliers, check supplierManagerInfo first, then fetch from Supplier model
                        ownerPhone = owner.supplierManagerInfo?.telephone || owner.supplierManagerInfo?.cellulaire || '';

                        // If not found in user info, fetch from Supplier model
                        if (!ownerPhone && owner.supplierManagerInfo?.organisme) {
                            const Supplier = (await import('../models/Supplier')).default;
                            const supplier = await Supplier.findById(owner.supplierManagerInfo.organisme).lean();
                            if (supplier && supplier.phone) {
                                ownerPhone = supplier.phone;
                            }
                        }
                    } else {
                        // For students
                        ownerPhone = owner?.parentInfo?.telephone || '';
                    }

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

                    try {
                        const userStores = await Store.find({ user: session.user.id }).lean();
                        const userStoreIds = userStores.map(userStore => userStore._id);
                        if (userStoreIds.length > 0) {
                            const clients = await Client.find({ storeId: { $in: userStoreIds } })
                                .sort({ createdAt: -1 })
                                .lean();

                            initialClients = clients.map(client => ({
                                ...client,
                                _id: client._id.toString(),
                                storeId: client.storeId?.toString() || client.storeId,
                                userId: client.userId?.toString() || client.userId,
                                totalSpent: client.totalSpent || 0,
                                lastOrderDate: client.lastOrderDate ? new Date(client.lastOrderDate).toISOString() : null,
                                createdAt: client.createdAt ? new Date(client.createdAt).toISOString() : null,
                                updatedAt: client.updatedAt ? new Date(client.updatedAt).toISOString() : null
                            }));
                        }
                    } catch (clientError) {
                        console.error('Error preloading clients for SSR:', clientError);
                    }

                    try {
                        initialSalesStats = await calculateSalesStatsForStore(store._id);
                    } catch (statsError) {
                        console.error('Error calculating sales stats for SSR:', statsError);
                        initialSalesStats = { total: 0, thisMonth: 0, growth: 0 };
                    }
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
        initialCampaignData: initialCampaignData || null,
        initialClients,
        initialSalesStats
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
 * Get total campaign school profit from ALL orders in a campaign
 */
export async function getCampaignTotalSchoolProfitSSR(campaignId, campaignData = null) {
    if (!campaignId) {
        return 0;
    }

    await dbConnect();

    let totalSchoolProfit = 0;

    try {
        // Fetch ALL orders for this campaign (not filtered by user)
        const queryConditions = {
            campaignId: mongoose.Types.ObjectId.isValid(campaignId)
                ? new mongoose.Types.ObjectId(campaignId)
                : campaignId,
            isTest: { $ne: true }
        };

        const allOrders = await Order.find(queryConditions).lean();

        allOrders.forEach(order => {
            // Add school donations
            const schoolDonation = order.schoolDonation || 0;
            totalSchoolProfit += schoolDonation;

            // Calculate profit from products
            if (order.products && Array.isArray(order.products)) {
                order.products.forEach(product => {
                    const quantity = product.quantity || 0;
                    const price = product.productPrice || product.price || 0;
                    const cost = product.productCost || product.cost || 0;
                    const rawProfit = (price - cost) * quantity;

                    let schoolProject = 0;

                    if (campaignData?.profitSplitType === 'absolute' && campaignData?.profitSplits) {
                        const productId = product.product?.toString() || product.productId;
                        const profitSplit = campaignData.profitSplits?.find(ps =>
                            ps.productId?.toString() === productId
                        );

                        if (profitSplit) {
                            schoolProject = (profitSplit.schoolProject || 0) * quantity;
                        }
                    }

                    totalSchoolProfit += schoolProject;
                });
            }
        });
    } catch (error) {
        console.error('Error calculating campaign total school profit:', error);
    }

    return Math.round(totalSchoolProfit * 100) / 100;
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
        } else if (user.role === 'supplier') {
            // For suppliers, get their supplier and find a campaign
            const supplierManager = await SupplierManager.findOne({
                user: session.user.id,
                status: 'active'
            }).populate('supplier').lean();

            if (supplierManager && supplierManager.supplier) {
                const supplierId = supplierManager.supplier._id;

                // Find a campaign for this supplier (prefer active one, or most recent)
                const supplierCampaign = await Campaign.findOne({ supplier: supplierId })
                    .populate('school', 'name address ville codePostal logo')
                    .sort({ isActive: -1, createdAt: -1 })
                    .lean();

                if (supplierCampaign) {
                    campaignId = supplierCampaign._id.toString();
                    if (supplierCampaign.school) {
                        schoolId = supplierCampaign.school._id?.toString() || supplierCampaign.school?.toString();
                    }
                }
            }
        }

        // Fetch campaign data
        let campaignData = null;
        let campaignSchoolData = null;

        if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
            campaignData = await Campaign.findById(campaignId)
                .populate('supplier', 'name')
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
                    .populate('supplier', 'name')
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
                    .populate('supplier', 'name')
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

        // Serialize campaign data, ensuring all values are JSON-serializable
        const serializedCampaign = campaignData ? (() => {
            const customPrices = (campaignData.customPrices || []).map(cp => {
                const productId = cp.productId?._id?.toString() || cp.productId?.toString();
                return {
                    productId: productId || null,
                    price: cp.price ?? null
                };
            }).filter(cp => cp.productId !== null && cp.productId !== undefined);

            const profitSplits = (campaignData.profitSplits || []).map(ps => {
                const productId = ps.productId?._id?.toString() || ps.productId?.toString();
                return {
                    productId: productId || null,
                    studentCash: ps.studentCash ?? null,
                    studentSchoolAccount: ps.studentSchoolAccount ?? null,
                    raffle: ps.raffle ?? null,
                    schoolProject: ps.schoolProject ?? null
                };
            }).filter(ps => ps.productId !== null && ps.productId !== undefined);

            return {
                _id: campaignData._id.toString(),
                campaignNumber: campaignData.campaignNumber ?? null,
                campaignCode: campaignData.campaignCode ?? null,
                startDate: campaignData.startDate?.toISOString() || null,
                endDate: campaignData.endDate?.toISOString() || null,
                deliveryDate: campaignData.deliveryDate?.toISOString() || null,
                financialGoal: campaignData.financialGoal ?? null,
                status: campaignData.status ?? 'draft',
                isActive: campaignData.isActive ?? false,
                profitSplitType: campaignData.profitSplitType ?? 'percentage',
                customPrices: customPrices,
                profitSplits: profitSplits,
                donationsForStudents: campaignData.donationsForStudents || null,
                donationsForSchool: campaignData.donationsForSchool || null,
                school: campaignData.school?._id?.toString() || campaignData.school?.toString() || null
            };
        })() : null;

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

        // Final serialization check - ensure all data is JSON-serializable
        const result = {
            campaignData: serializedCampaign,
            schoolData: serializedSchool,
            products: serializedProducts,
            user: serializedUser
        };

        // Deep serialize to catch any remaining non-serializable values
        try {
            JSON.parse(JSON.stringify(result));
        } catch (serializationError) {
            console.error('Serialization error in getDetailPageSSR:', serializationError);
            // Return safe fallback
            return {
                campaignData: null,
                schoolData: null,
                products: [],
                user: serializedUser
            };
        }

        return result;
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

        // Get campaign data for earnings calculation
        const { campaign, fallbackSplit } = await getCampaignDataWithFallback(schoolId, school, campaignId);

        // Determine useful campaign metadata (dates, normalized IDs)
        // IMPORTANT: Define campaignIdForQuery early so it can be used below
        const campaignIdForQuery = campaignId || (campaign?._id?.toString() || null);
        const normalizedSchoolId = school?._id?.toString() || schoolId?.toString?.() || schoolId;

        // Fetch all participants in the campaign (students AND school_managers who joined)
        // IMPORTANT: When campaignId is provided, find participants by campaignId, not by schoolId
        // This allows school_managers who joined campaigns from other schools to see the correct leaderboard
        let participants = [];
        if (campaignIdForQuery) {
            // Find all users (students AND school_managers) who have joined this specific campaign
            const campaignObjectId = mongoose.Types.ObjectId.isValid(campaignIdForQuery)
                ? new mongoose.Types.ObjectId(campaignIdForQuery)
                : campaignIdForQuery;

            participants = await User.find({
                // Include both students and school_managers who joined the campaign
                $or: [
                    { 'campaigns.campaignId': campaignObjectId },
                    { 'campaigns.campaignId': campaignIdForQuery },
                    { activeCampaignId: campaignObjectId },
                    { activeCampaignId: campaignIdForQuery }
                ]
            }).lean();
        } else {
            // Fallback: find students by schoolId (legacy behavior)
            participants = await User.find({
                $or: [
                    { school: schoolId, role: 'student' },
                    { 'campaigns.schoolId': schoolId, role: 'student' }
                ]
            }).lean();
        }

        // Rename for clarity - these are participants, not just students
        const students = participants;

        if (!students || students.length === 0) {
            return {
                topPerformers: [],
                userRank: null,
                userTotalEarnings: '0.00',
                userTotalProductsSold: 0,
                userCategory: 'Noob'
            };
        }

        // Determine useful campaign metadata (dates, normalized IDs)
        let startDate = null;
        let endDate = null;

        if (campaign) {
            if (campaign.startDate) {
                startDate = new Date(campaign.startDate);
                // Set to start of day in UTC (00:00:00 UTC) to include all orders from the start date
                // This handles timezone issues where orders might be created before the exact start time
                // Use UTC methods to avoid timezone conversion issues
                startDate = new Date(Date.UTC(
                    startDate.getUTCFullYear(),
                    startDate.getUTCMonth(),
                    startDate.getUTCDate(),
                    0, 0, 0, 0
                ));
            }
            if (campaign.endDate) {
                endDate = new Date(campaign.endDate);
            } else if (campaign.deliveryDate) {
                endDate = new Date(campaign.deliveryDate);
            }
            if (endDate) {
                // Set to end of day in UTC (23:59:59.999 UTC) to include all orders from the end date
                endDate = new Date(Date.UTC(
                    endDate.getUTCFullYear(),
                    endDate.getUTCMonth(),
                    endDate.getUTCDate(),
                    23, 59, 59, 999
                ));
                endDate.setUTCDate(endDate.getUTCDate() + 30); // include post-campaign fulfilment window
            }
        }

        const buildCampaignConditions = (id) => {
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return [];
            }
            const campaignObjectId = new mongoose.Types.ObjectId(id);
            const idAsString = campaignObjectId.toString();

            return [
                { campaignId: campaignObjectId },
                { campaignId: idAsString },
                { campaignId: id },
                { campaignId: null },
                { campaignId: { $exists: false } }
            ];
        };

        const campaignConditions = buildCampaignConditions(campaignIdForQuery);

        // Calculate total earnings for each student (filtered by campaign if provided)
        const studentData = await Promise.all(students.map(async (student) => {
            const userId = student._id.toString();

            // Build order query
            let orderQuery = {
                user: userId
            };

            if (startDate || endDate) {
                const createdAtRange = {};
                if (startDate) createdAtRange.$gte = startDate;
                if (endDate) createdAtRange.$lte = endDate;
                if (Object.keys(createdAtRange).length > 0) {
                    orderQuery.createdAt = createdAtRange;
                }
            }

            // IMPORTANT: Don't filter by school when campaignId is provided
            // Orders belong to the campaign's school, not the user's school
            // This allows school_managers to see their orders from campaigns of other schools
            if (!campaignIdForQuery) {
                // Only filter by school if no campaignId (legacy behavior)
                if (normalizedSchoolId) {
                    const schoolCandidates = [normalizedSchoolId];
                    if (mongoose.Types.ObjectId.isValid(normalizedSchoolId)) {
                        schoolCandidates.push(new mongoose.Types.ObjectId(normalizedSchoolId));
                    }
                    orderQuery.school = schoolCandidates.length > 1
                        ? { $in: schoolCandidates }
                        : normalizedSchoolId;
                }
            }

            // Filter by campaignId - convert to ObjectId if needed
            // IMPORTANT: Also include orders without campaignId if they belong to the user and school
            // This handles legacy orders or orders created before campaign system was fully implemented
            if (campaignIdForQuery) {
                const campaignObjectId = mongoose.Types.ObjectId.isValid(campaignIdForQuery)
                    ? new mongoose.Types.ObjectId(campaignIdForQuery)
                    : campaignIdForQuery;

                // Build school filter for legacy orders (orders without campaignId)
                const schoolFilterForLegacy = normalizedSchoolId ? (
                    mongoose.Types.ObjectId.isValid(normalizedSchoolId)
                        ? { $in: [normalizedSchoolId, new mongoose.Types.ObjectId(normalizedSchoolId)] }
                        : normalizedSchoolId
                ) : null;

                // Include orders with matching campaignId OR orders without campaignId that belong to this school
                const campaignConditionsForQuery = [
                    { campaignId: campaignObjectId }
                ];

                // Add legacy order condition (orders without campaignId for this school)
                if (schoolFilterForLegacy) {
                    campaignConditionsForQuery.push({
                        $and: [
                            { $or: [{ campaignId: null }, { campaignId: { $exists: false } }] },
                            { school: schoolFilterForLegacy }
                        ]
                    });
                }

                // Use $or for campaignId conditions, but keep other conditions (user, dates) separate
                orderQuery = {
                    user: userId,
                    ...(startDate || endDate ? {
                        createdAt: {
                            ...(startDate ? { $gte: startDate } : {}),
                            ...(endDate ? { $lte: endDate } : {})
                        }
                    } : {}),
                    $or: campaignConditionsForQuery
                };
            } else if (campaignConditions.length > 0) {
                // Legacy behavior: use campaignConditions if no campaignIdForQuery
                orderQuery.$or = campaignConditions;
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

        // Calculate groups if campaign has groups enabled
        let groupsData = [];
        let userGroup = null;
        let userGroupRank = null;

        if (campaign && campaign.groups && campaign.groups.enabled && campaign.groups.list && campaign.groups.list.length > 0) {
            // Get user's group
            const currentUser = await User.findById(session.user.id).select('campaigns').lean();
            if (currentUser && currentUser.campaigns) {
                const userCampaignEntry = currentUser.campaigns.find(
                    c => c.campaignId?.toString() === campaignIdForQuery
                );
                userGroup = userCampaignEntry?.groupId || null;
            }

            // Create student group map
            const studentsWithCampaigns = await User.find({
                _id: { $in: sortedStudentData.map(d => d.student._id) }
            }).select('campaigns').lean();

            const studentGroupMap = {};
            studentsWithCampaigns.forEach(student => {
                if (student.campaigns) {
                    const campaignEntry = student.campaigns.find(
                        c => c.campaignId?.toString() === campaignIdForQuery
                    );
                    if (campaignEntry) {
                        studentGroupMap[student._id.toString()] = campaignEntry.groupId;
                    }
                }
            });

            // Aggregate by group
            const groupStats = {};

            for (const group of campaign.groups.list) {
                const groupName = group.name;
                const studentsInGroup = sortedStudentData.filter(data => {
                    const studentId = data.student._id.toString();
                    const studentGroupId = studentGroupMap[studentId];
                    // Match if groupId matches group name, or if both are null/undefined (default group)
                    return studentGroupId === groupName || (studentGroupId == null && groupName === 'Autre');
                });

                if (studentsInGroup.length > 0) {
                    const totalProductsSold = studentsInGroup.reduce((sum, data) => sum + data.totalProductsSold, 0);
                    const totalSales = studentsInGroup.reduce((sum, data) => sum + data.totalSales, 0);

                    // Get individual rankings within group
                    const groupStudents = studentsInGroup.map((data, index) => {
                        const studentId = data.student._id.toString();
                        return {
                            _id: studentId,
                            userId: studentId,
                            name: data.student.name,
                            rank: index + 1,
                            totalEarnings: data.totalEarnings.toFixed(2),
                            totalProductsSold: data.totalProductsSold,
                            totalSales: data.totalSales || 0,
                            category: data.category,
                            groupId: studentGroupMap[studentId] || null
                        };
                    });

                    groupStats[groupName] = {
                        name: groupName,
                        totalProductsSold,
                        totalSales,
                        participants: studentsInGroup.length,
                        students: groupStudents
                    };
                } else {
                    // Empty group
                    groupStats[groupName] = {
                        name: groupName,
                        totalProductsSold: 0,
                        totalSales: 0,
                        participants: 0,
                        students: []
                    };
                }
            }

            // Sort groups by total products sold (descending)
            groupsData = Object.values(groupStats)
                .sort((a, b) => b.totalProductsSold - a.totalProductsSold)
                .map((group, index) => ({
                    ...group,
                    rank: index + 1
                }));

            // Find user's group rank (the rank of the group itself, not individual rank within group)
            if (userGroup) {
                const userGroupData = groupsData.find(g => g.name === userGroup);
                if (userGroupData) {
                    // Return the group's rank in the overall group ranking
                    userGroupRank = userGroupData.rank || null;
                }
            }
        }

        return {
            topPerformers,
            groups: groupsData,
            userRank,
            userGroup,
            userGroupRank,
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
