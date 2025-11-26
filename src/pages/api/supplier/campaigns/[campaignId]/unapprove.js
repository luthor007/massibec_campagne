import dbConnect from '../../../../../lib/mongodb';
import Campaign from '../../../../../models/Campaign';
import SupplierManager from '../../../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

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

        const { campaignId } = req.query;

        if (!campaignId) {
            return res.status(400).json({ message: 'ID de campagne requis' });
        }

        // Find the campaign and verify it belongs to this supplier
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campagne non trouvée' });
        }

        // Verify the campaign belongs to this supplier
        if (campaign.supplier.toString() !== supplierId.toString()) {
            return res.status(403).json({ message: 'Vous n\'avez pas accès à cette campagne' });
        }

        // Only allow unapproving if campaign is in production mode
        if (campaign.mode !== 'production') {
            return res.status(400).json({
                message: `La campagne doit être en mode production pour être repassée en test. Mode actuel: ${campaign.mode || 'test'}`
            });
        }

        // Update campaign mode from production to test
        campaign.mode = 'test';
        campaign.approvedBy = undefined;
        campaign.approvedAt = undefined;
        campaign.isActive = false;

        // Save the campaign
        await campaign.save();

        console.log('Campaign unapproved successfully:', {
            campaignId: campaign._id,
            supplierId: supplierId,
            previousStatus: 'approved',
            newStatus: campaign.status
        });

        res.status(200).json({
            message: 'Campagne désapprouvée avec succès',
            campaign: campaign.toObject()
        });

    } catch (error) {
        console.error('Error unapproving campaign:', error);
        res.status(500).json({ message: 'Erreur lors de la désapprobation de la campagne', error: error.message });
    }
}

