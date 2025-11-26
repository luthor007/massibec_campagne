import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';
import SupplierManager from '../../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const { campaignId } = req.query;
        const { rejectionReason } = req.body;

        // Verify supplier has access to this campaign
        const supplierManager = await SupplierManager.findOne({
            user: token.sub,
            status: 'active'
        }).populate('supplier');

        if (!supplierManager || !supplierManager.supplier) {
            return res.status(404).json({ message: 'Fournisseur non trouvé' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campagne non trouvée' });
        }

        if (campaign.supplier.toString() !== supplierManager.supplier._id.toString()) {
            return res.status(403).json({ message: 'Vous n\'avez pas accès à cette campagne' });
        }

        // Reject campaign
        campaign.status = 'rejected';
        campaign.rejectedBy = token.sub;
        campaign.rejectedAt = new Date();
        if (rejectionReason) {
            campaign.rejectionReason = rejectionReason;
        }

        await campaign.save();

        res.status(200).json({
            message: 'Campagne refusée avec succès',
            campaign: campaign
        });
    } catch (error) {
        console.error('Error rejecting campaign:', error);
        res.status(500).json({ message: 'Erreur lors du refus de la campagne' });
    }
}

