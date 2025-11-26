import dbConnect from '../../../lib/mongodb';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import User from '../../../models/User';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            await dbConnect();

            // Get authenticated supplier user
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
                .populate('school', 'name address email telephone')
                .populate('customPrices.productId', 'name price cost image description')
                .populate('profitSplits.productId', 'name price cost image description')
                .sort({ createdAt: -1 })
                .lean();

            // Get participant counts for all campaigns
            const campaignIds = campaigns.map(c => c._id);
            let participantCountMap = {};

            try {
                if (campaignIds.length > 0) {
                    const participantCounts = await User.aggregate([
                        { $unwind: '$campaigns' },
                        { $match: { 'campaigns.campaignId': { $in: campaignIds } } },
                        { $group: { _id: '$campaigns.campaignId', count: { $sum: 1 } } }
                    ]);

                    participantCounts.forEach(pc => {
                        participantCountMap[pc._id.toString()] = pc.count;
                    });
                }
            } catch (err) {
                console.error('Error counting participants:', err);
                // Continue with empty map
            }

            // Format campaigns for frontend
            const formattedCampaigns = campaigns.map(campaign => {
                const campaignId = campaign._id.toString();

                return {
                    _id: campaign._id,
                    campaignNumber: campaign.campaignNumber,
                    campaignCode: campaign.campaignCode,
                    // Map to frontend expected field names
                    nomCampagne: campaign.name || `Campagne #${campaign.campaignNumber}`,
                    name: campaign.name || `Campagne #${campaign.campaignNumber}`,
                    debutCampagne: campaign.startDate,
                    finCampagne: campaign.endDate,
                    startDate: campaign.startDate,
                    endDate: campaign.endDate,
                    dateDeLivraison: campaign.deliveryDate,
                    deliveryDate: campaign.deliveryDate,
                    objectifFinancier: campaign.financialGoal,
                    financialGoal: campaign.financialGoal,
                    // Map status to frontend expected values
                    status: campaign.status === 'pending_approval' ? 'pending' :
                        campaign.status === 'approved' ? 'active' :
                            campaign.status,
                    mode: campaign.mode || 'test', // Include mode field (test or production)
                    isActive: campaign.isActive,
                    profitSplitType: campaign.profitSplitType,
                    profitSplit: campaign.profitSplit,
                    profitSplits: campaign.profitSplits,
                    customPrices: campaign.customPrices,
                    rejectionReason: campaign.rejectionReason,
                    approvedBy: campaign.approvedBy,
                    approvedAt: campaign.approvedAt,
                    rejectedBy: campaign.rejectedBy,
                    rejectedAt: campaign.rejectedAt,
                    supplierProposals: campaign.supplierProposals,
                    notes: campaign.notes,
                    totalSales: campaign.totalSales || 0,
                    totalOrders: campaign.totalOrders || 0,
                    totalParticipants: participantCountMap[campaignId] || 0,
                    school: campaign.school ? {
                        _id: campaign.school._id,
                        nomEcole: campaign.school.name || 'Unknown',
                        name: campaign.school.name || 'Unknown',
                        address: campaign.school.address,
                        email: campaign.school.email,
                        telephone: campaign.school.telephone
                    } : null,
                    source: 'separate'
                };
            });

            res.status(200).json(formattedCampaigns);
        } catch (error) {
            console.error('Error fetching supplier campaigns:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des campagnes', error: error.message });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}

