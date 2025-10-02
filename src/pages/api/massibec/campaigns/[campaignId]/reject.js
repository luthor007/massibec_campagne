import dbConnect from '../../../../../lib/mongodb';
import School from '../../../../../models/School';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await dbConnect();

      // Extract the token from the request
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas connecté' });
      }

      const { campaignId } = req.query;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Une raison de rejet est requise' });
      }

      // Find the school that contains this campaign
      const school = await School.findOne({
        'campaigns._id': campaignId
      });

      if (!school) {
        return res.status(404).json({ message: 'Campagne non trouvée' });
      }

      // Find the specific campaign
      const campaign = school.campaigns.id(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: 'Campagne non trouvée' });
      }

      // Check if campaign is pending approval
      if (campaign.status !== 'pending_approval') {
        return res.status(400).json({ message: 'Cette campagne ne peut pas être rejetée' });
      }

      // Update campaign status
      campaign.status = 'rejected';
      campaign.rejectionReason = reason.trim();
      campaign.approvedBy = token.sub;
      campaign.approvedAt = new Date();
      
      // Clear any Massibec modifications when rejected
      campaign.massibecModifications = undefined;

      await school.save();

      res.status(200).json({ 
        message: 'Campagne rejetée avec succès',
        campaign: campaign
      });

    } catch (error) {
      console.error('Error rejecting campaign:', error);
      res.status(500).json({ message: 'Erreur lors du rejet de la campagne', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
