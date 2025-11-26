import dbConnect from '../../../lib/mongodb';
import Order from '../../../models/Order';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        // Get supplier for this user
        const supplierManager = await SupplierManager.findOne({
            user: token.sub,
            status: 'active'
        }).populate('supplier');

        if (!supplierManager || !supplierManager.supplier) {
            return res.status(404).json({ message: 'Fournisseur non trouvé' });
        }

        const supplierId = supplierManager.supplier._id;

        // Get all campaigns for this supplier
        const campaigns = await Campaign.find({ supplier: supplierId })
            .populate('school', 'name')
            .populate('supplier', 'name')
            .lean();

        // Create a map of campaigns by ID for quick lookup
        const campaignMap = {};
        campaigns.forEach(campaign => {
            const id = campaign._id.toString();
            campaignMap[id] = campaign;
        });

        // Get all orders for campaigns that belong to this supplier
        // First get campaign IDs for this supplier
        const campaignIds = campaigns.map(c => c._id);

        const orders = await Order.find({ campaignId: { $in: campaignIds } })
            .populate({
                path: 'campaignId',
                select: 'campaignNumber campaignCode name startDate endDate deliveryDate supplier school',
                populate: [
                    {
                        path: 'supplier',
                        select: 'name'
                    },
                    {
                        path: 'school',
                        select: 'name'
                    }
                ]
            })
            .populate('school', 'name')
            .populate('user', 'name email')
            .populate('products.product', 'name pricePickup')
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();

        // Filter orders that have valid campaigns
        const filteredOrders = orders.filter(order => order.campaignId);

        // Group orders by campaign and calculate statistics
        const campaignStats = {};

        for (const order of filteredOrders) {
            const campaignId = order.campaignId?._id?.toString() || order.campaignId?.toString();
            if (!campaignId) continue;

            if (!campaignStats[campaignId]) {
                // Try to get campaign from populated order.campaignId first, then from campaignMap
                let campaign = null;

                // Check if order.campaignId is populated (object with properties)
                if (order.campaignId && typeof order.campaignId === 'object' && order.campaignId._id) {
                    campaign = order.campaignId;
                } else {
                    // Fallback to campaignMap
                    campaign = campaignMap[campaignId];
                }

                if (!campaign) {
                    console.warn(`Campaign ${campaignId} not found in campaignMap or order.campaignId`);
                    continue;
                }

                // Calculate days remaining
                let daysRemaining = 0;
                if (campaign.endDate) {
                    try {
                        const now = new Date();
                        const endDate = new Date(campaign.endDate);
                        if (!isNaN(endDate.getTime())) {
                            daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
                        }
                    } catch (error) {
                        console.error('Error calculating days remaining:', error);
                        daysRemaining = 0;
                    }
                }

                // Ensure school is properly populated
                let schoolData = null;
                if (campaign.school) {
                    if (typeof campaign.school === 'object' && campaign.school._id) {
                        // Already populated
                        schoolData = campaign.school;
                    } else {
                        // Need to fetch school
                        const schoolId = campaign.school.toString();
                        const school = await School.findById(schoolId).select('name').lean();
                        if (school) {
                            schoolData = school;
                        }
                    }
                }

                campaignStats[campaignId] = {
                    campaign: {
                        _id: campaign._id,
                        campaignNumber: campaign.campaignNumber || null,
                        campaignCode: campaign.campaignCode || null,
                        name: campaign.name || null,
                        startDate: campaign.startDate,
                        endDate: campaign.endDate,
                        deliveryDate: campaign.deliveryDate,
                        school: schoolData,
                        daysRemaining: daysRemaining,
                        isActive: campaign.isActive,
                        status: campaign.status
                    },
                    productStats: {}, // productId -> { quantity, totalPayment }
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalPayment: 0
                };
            }

            campaignStats[campaignId].totalOrders += 1;
            campaignStats[campaignId].totalRevenue += order.totalAmount || 0;

            // Aggregate product quantities and payments
            if (order.products && Array.isArray(order.products)) {
                for (const item of order.products) {
                    const productId = item.product?._id?.toString() || item.product?.toString();
                    if (!productId) continue;

                    const product = item.product;
                    const pricePickup = product?.pricePickup || 0;
                    const quantity = item.quantity || 0;
                    const payment = pricePickup * quantity;

                    if (!campaignStats[campaignId].productStats[productId]) {
                        campaignStats[campaignId].productStats[productId] = {
                            productId: productId,
                            productName: item.productName || product?.name || 'Produit inconnu',
                            quantity: 0,
                            totalPayment: 0,
                            pricePickup: pricePickup
                        };
                    }

                    campaignStats[campaignId].productStats[productId].quantity += quantity;
                    campaignStats[campaignId].productStats[productId].totalPayment += payment;
                    campaignStats[campaignId].totalPayment += payment;
                }
            }
        }

        // Convert to array format
        const campaignSummaries = Object.values(campaignStats).map(stat => ({
            ...stat,
            products: Object.values(stat.productStats)
        }));

        // Format individual orders for backward compatibility
        const formattedOrders = filteredOrders.map(order => ({
            _id: order._id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount || 0,
            status: order.status || (order.transferAmount >= order.totalAmount ? 'paid' : 'pending'),
            customerEmail: order.user?.email || order.customerEmail,
            schoolName: order.school?.name || 'N/A',
            createdAt: order.createdAt,
            campaignId: order.campaignId?._id?.toString() || order.campaignId?.toString()
        }));

        res.status(200).json({
            orders: formattedOrders,
            campaignSummaries: campaignSummaries
        });
    } catch (error) {
        console.error('Error fetching supplier orders:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des commandes',
            error: error.message
        });
    }
}


