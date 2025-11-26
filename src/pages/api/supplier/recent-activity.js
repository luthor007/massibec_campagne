import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import Order from '../../../models/Order';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        // Verify authentication
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const activities = [];

        // Get recent school approvals/rejections
        const recentSchools = await School.find({
            $or: [
                { status: 'approved', updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                { status: 'rejected', updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
            ]
        })
            .sort({ updatedAt: -1 })
            .limit(5)
            .select('name status updatedAt')
            .lean();

        recentSchools.forEach(school => {
            activities.push({
                type: school.status === 'approved' ? 'approval' : 'rejection',
                message: school.status === 'approved'
                    ? `École "${school.name}" approuvée`
                    : `École "${school.name}" rejetée`,
                timestamp: school.updatedAt
            });
        });

        // Get recent campaign approvals/rejections
        const recentCampaigns = await Campaign.find({
            $or: [
                { status: 'approved', updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                { status: 'rejected', updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
            ]
        })
            .populate('school', 'name')
            .sort({ updatedAt: -1 })
            .limit(5)
            .select('campaignNumber school status updatedAt')
            .lean();

        recentCampaigns.forEach(campaign => {
            activities.push({
                type: 'campaign',
                message: campaign.status === 'approved'
                    ? `Campagne #${campaign.campaignNumber} de "${campaign.school?.name || 'École'}" approuvée`
                    : `Campagne #${campaign.campaignNumber} de "${campaign.school?.name || 'École'}" rejetée`,
                timestamp: campaign.updatedAt
            });
        });

        // Get recent high-value orders
        const recentOrders = await Order.find({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            totalAmount: { $gte: 500 }
        })
            .populate('school', 'name')
            .sort({ createdAt: -1 })
            .limit(3)
            .select('totalAmount school createdAt')
            .lean();

        recentOrders.forEach(order => {
            activities.push({
                type: 'order',
                message: `Nouvelle commande de ${order.totalAmount.toFixed(2)} $ de "${order.school?.name || 'École'}"`,
                timestamp: order.createdAt
            });
        });

        // Sort all activities by timestamp
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.status(200).json({
            activities: activities.slice(0, 10) // Return top 10 most recent
        });

    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération de l\'activité',
            error: error.message
        });
    }
}



