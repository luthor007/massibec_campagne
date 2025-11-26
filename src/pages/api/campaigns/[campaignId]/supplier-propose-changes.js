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
        const {
            startDate,
            endDate,
            deliveryDate,
            distributionStartHour,
            distributionEndHour,
            truckArrivalHour,
            notes
        } = req.body;

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

        // Create proposal
        const proposal = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
            distributionStartHour: distributionStartHour || undefined,
            distributionEndHour: distributionEndHour || undefined,
            truckArrivalHour: truckArrivalHour || undefined,
            notes: notes || undefined,
            proposedAt: new Date(),
            proposedBy: token.sub,
            status: 'pending'
        };

        // Remove undefined values
        Object.keys(proposal).forEach(key => {
            if (proposal[key] === undefined) {
                delete proposal[key];
            }
        });

        campaign.supplierProposals = proposal;
        await campaign.save();

        res.status(200).json({
            message: 'Proposition de changements envoyée avec succès',
            proposal: campaign.supplierProposals
        });
    } catch (error) {
        console.error('Error proposing changes:', error);
        res.status(500).json({ message: 'Erreur lors de la proposition de changements' });
    }
}

