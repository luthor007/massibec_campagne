import dbConnect from '../../../../../lib/mongodb';
import Campaign from '../../../../../models/Campaign';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await dbConnect();

    // Extract the token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    // Check if user is supplier/admin (fournisseur role)
    if (token.role !== 'fournisseur') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ message: 'ID de campagne requis' });
    }

    // Find the campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Only allow unapproving if campaign is approved
    if (campaign.status !== 'approved') {
      return res.status(400).json({
        message: `La campagne doit être approuvée pour être désapprouvée. Statut actuel: ${campaign.status}`
      });
    }

    // Update campaign status to pending_approval
    campaign.status = 'pending_approval';
    campaign.approvedBy = undefined;
    campaign.approvedAt = undefined;
    campaign.isActive = false;

    // Save the campaign
    await campaign.save();

    console.log('Campaign unapproved successfully:', {
      campaignId: campaign._id,
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



