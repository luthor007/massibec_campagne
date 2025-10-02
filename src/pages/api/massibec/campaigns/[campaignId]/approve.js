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
        return res.status(400).json({ message: 'Cette campagne ne peut pas être approuvée' });
      }

      // Update campaign status
      campaign.status = 'approved';
      campaign.approvedBy = token.sub;
      campaign.approvedAt = new Date();
      campaign.isActive = true;
      
      // Clear any Massibec modifications when approved
      campaign.massibecModifications = undefined;

      // Update school's main campaign dates and info
      school.debutCampagne = campaign.startDate;
      school.finCampagne = campaign.endDate;
      school.dateDeLivraison = campaign.deliveryDate;
      school.objectifFinancier = campaign.financialGoal;
      school.currentCampaignNumber = campaign.campaignNumber;
      school.activeCampaignId = campaign._id;

      // Deactivate other campaigns
      school.campaigns.forEach(c => {
        if (c._id.toString() !== campaignId) {
          c.isActive = false;
        }
      });

      await school.save();

      res.status(200).json({ 
        message: 'Campagne approuvée avec succès',
        campaign: campaign
      });

    } catch (error) {
      console.error('Error approving campaign:', error);
      res.status(500).json({ message: 'Erreur lors de l\'approbation de la campagne', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
