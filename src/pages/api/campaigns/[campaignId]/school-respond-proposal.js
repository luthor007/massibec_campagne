import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';
import SchoolManager from '../../../../models/SchoolManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'school_manager') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const { campaignId } = req.query;
        const { accept } = req.body; // true or false

        // Verify school manager has access to this campaign
        const schoolManager = await SchoolManager.findOne({
            user: token.sub,
            status: 'active'
        }).populate('school');

        if (!schoolManager || !schoolManager.school) {
            return res.status(404).json({ message: 'École non trouvée' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campagne non trouvée' });
        }

        if (campaign.school.toString() !== schoolManager.school._id.toString()) {
            return res.status(403).json({ message: 'Vous n\'avez pas accès à cette campagne' });
        }

        if (!campaign.supplierProposals || campaign.supplierProposals.status !== 'pending') {
            return res.status(400).json({ message: 'Aucune proposition en attente' });
        }

        if (accept) {
            // Accept proposal and update campaign dates
            if (campaign.supplierProposals.startDate) {
                campaign.startDate = campaign.supplierProposals.startDate;
            }
            if (campaign.supplierProposals.endDate) {
                campaign.endDate = campaign.supplierProposals.endDate;
            }
            if (campaign.supplierProposals.deliveryDate) {
                campaign.deliveryDate = campaign.supplierProposals.deliveryDate;
            }
            if (campaign.supplierProposals.distributionStartHour) {
                campaign.distributionStartHour = campaign.supplierProposals.distributionStartHour;
            }
            if (campaign.supplierProposals.distributionEndHour) {
                campaign.distributionEndHour = campaign.supplierProposals.distributionEndHour;
            }
            if (campaign.supplierProposals.truckArrivalHour) {
                campaign.truckArrivalHour = campaign.supplierProposals.truckArrivalHour;
            }

            campaign.supplierProposals.status = 'accepted';
        } else {
            campaign.supplierProposals.status = 'rejected';
        }

        campaign.supplierProposals.respondedAt = new Date();
        campaign.supplierProposals.respondedBy = token.sub;

        await campaign.save();

        res.status(200).json({
            message: accept ? 'Proposition acceptée avec succès' : 'Proposition refusée',
            campaign: campaign
        });
    } catch (error) {
        console.error('Error responding to proposal:', error);
        res.status(500).json({ message: 'Erreur lors de la réponse à la proposition' });
    }
}

