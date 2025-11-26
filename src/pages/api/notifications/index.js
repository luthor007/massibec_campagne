import dbConnect from '../../../lib/mongodb';
import Conversation from '../../../models/Conversation';
import Message from '../../../models/Message';
import Campaign from '../../../models/Campaign';
import Order from '../../../models/Order';
import Review from '../../../models/Review';
import SupplierManager from '../../../models/SupplierManager';
import SchoolManager from '../../../models/SchoolManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    try {
        await dbConnect();
    } catch (dbError) {
        return res.status(500).json({ message: 'Erreur de connexion à la base de données', error: dbError.message });
    }

    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const userId = token.sub;
        const userRole = token.role;

        const notifications = [];

        if (userRole === 'school_manager') {
            // Get school for this user
            const schoolManager = await SchoolManager.findOne({
                user: userId,
                status: 'active'
            }).populate('school');

            if (schoolManager && schoolManager.school) {
                const schoolId = schoolManager.school._id;

                // Unread messages
                const conversations = await Conversation.find({
                    school: schoolId,
                    unreadCountSchool: { $gt: 0 }
                })
                    .populate('supplier', 'name')
                    .populate('lastMessage')
                    .lean();

                conversations.forEach(conv => {
                    if (conv.supplier && conv.lastMessage) {
                        notifications.push({
                            id: `message-${conv._id}`,
                            type: 'new_message',
                            title: 'Nouveau message',
                            message: `${conv.supplier?.name || 'Fournisseur'}: ${conv.lastMessage?.content?.substring(0, 50) || ''}...`,
                            timestamp: conv.lastMessageAt || new Date(),
                            link: `/dashboard-manager?conversation=${conv._id}`
                        });
                    }
                });

                // Pending campaign approvals
                const pendingCampaigns = await Campaign.find({
                    school: schoolId,
                    status: 'pending_approval'
                })
                    .populate('supplier', 'name')
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean();

                pendingCampaigns.forEach(campaign => {
                    notifications.push({
                        id: `campaign-${campaign._id}`,
                        type: 'campaign_pending',
                        title: 'Campagne en attente',
                        message: `Campagne "${campaign.name || campaign.campaignCode}" en attente d'approbation`,
                        timestamp: campaign.createdAt,
                        link: `/dashboard-manager/campaigns/${campaign._id}`
                    });
                });
            }
        } else if (userRole === 'supplier') {
            // Get supplier for this user
            const supplierManager = await SupplierManager.findOne({
                user: userId,
                status: 'active'
            }).populate('supplier');

            if (supplierManager && supplierManager.supplier) {
                const supplierId = supplierManager.supplier._id;

                // Unread messages
                const conversations = await Conversation.find({
                    supplier: supplierId,
                    unreadCountSupplier: { $gt: 0 }
                })
                    .populate('school', 'name')
                    .populate('lastMessage')
                    .lean();

                conversations.forEach(conv => {
                    if (conv.school && conv.lastMessage) {
                        notifications.push({
                            id: `message-${conv._id}`,
                            type: 'new_message',
                            title: 'Nouveau message',
                            message: `${conv.school?.name || 'École'}: ${conv.lastMessage?.content?.substring(0, 50) || ''}...`,
                            timestamp: conv.lastMessageAt || new Date(),
                            link: `/dashboard-supplier?conversation=${conv._id}`
                        });
                    }
                });

                // Pending campaign approvals
                const pendingCampaigns = await Campaign.find({
                    supplier: supplierId,
                    status: 'pending_approval'
                })
                    .populate('school', 'name')
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean();

                pendingCampaigns.forEach(campaign => {
                    notifications.push({
                        id: `campaign-${campaign._id}`,
                        type: 'campaign_pending',
                        title: 'Campagne en attente',
                        message: `Campagne avec ${campaign.school.name} en attente d'approbation`,
                        timestamp: campaign.createdAt,
                        link: `/dashboard-supplier/campaigns/${campaign._id}`
                    });
                });

                // Recent orders
                const recentOrders = await Order.find({
                    store: { $exists: true }
                })
                    .populate('store')
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean();

                recentOrders.forEach(order => {
                    const orderSupplierId = order.store?.supplier?._id?.toString() || order.store?.supplier?.toString();
                    if (orderSupplierId && orderSupplierId === supplierId.toString()) {
                        notifications.push({
                            id: `order-${order._id}`,
                            type: 'order_received',
                            title: 'Commande reçue',
                            message: `Commande #${order.orderId || order._id.toString().slice(-6)} pour ${order.totalAmount?.toFixed(2) || 0} $`,
                            timestamp: order.createdAt || new Date(),
                            link: `/dashboard-supplier/orders/${order._id}`
                        });
                    }
                });

                // Recent reviews (last 7 days)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const recentReviews = await Review.find({
                    supplier: supplierId,
                    createdAt: { $gte: sevenDaysAgo }
                })
                    .populate('school', 'name')
                    .populate('campaign', 'name campaignCode')
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean();

                recentReviews.forEach(review => {
                    if (review.school) {
                        const campaignInfo = review.campaign
                            ? ` pour la campagne "${review.campaign.name || review.campaign.campaignCode}"`
                            : '';
                        notifications.push({
                            id: `review-${review._id}`,
                            type: 'new_review',
                            title: 'Nouvelle révision',
                            message: `${review.school?.name || 'École'} vous a laissé une révision${campaignInfo}: ${review.rating || 0}/5 étoiles`,
                            timestamp: review.createdAt || new Date(),
                            link: '/dashboard-supplier#reviews'
                        });
                    }
                });
            }
        }

        // Sort by timestamp (newest first) and limit to 20
        notifications.sort((a, b) => {
            const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return dateB - dateA;
        });
        const limitedNotifications = notifications.slice(0, 20);

        res.status(200).json({ notifications: limitedNotifications });
    } catch (error) {
        // Return empty notifications array instead of error to prevent UI breakage
        res.status(200).json({ notifications: [] });
    }
}

