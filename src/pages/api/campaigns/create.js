import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import User from '../../../models/User';
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

      const userId = token.sub;

      // Get user info to find the school
      const user = await User.findById(userId).lean();

      if (!user || user.role !== 'school_manager') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        startDate,
        endDate,
        deliveryDate,
        financialGoal,
        customPrices,
        profitSplits
      } = req.body;

      // Validate required fields
      if (!startDate || !endDate || !deliveryDate || !financialGoal) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const delivery = new Date(deliveryDate);
      const today = new Date();

      if (start <= today) {
        return res.status(400).json({ message: 'La date de début doit être dans le futur' });
      }

      if (end <= start) {
        return res.status(400).json({ message: 'La date de fin doit être après la date de début' });
      }

      // Check if delivery date is at least 3 weeks after end date
      const threeWeeksInMillis = 21 * 24 * 60 * 60 * 1000;
      if (delivery.getTime() - end.getTime() < threeWeeksInMillis) {
        return res.status(400).json({ message: 'La date de livraison doit être au moins 3 semaines après la fin de la campagne' });
      }


      // Find the school
      const school = await School.findById(user.schoolManagerInfo.organisme);
      if (!school) {
        return res.status(404).json({ message: 'École non trouvée' });
      }

      // Create new campaign
      const newCampaignNumber = school.currentCampaignNumber + 1;
      
      const newCampaign = new Campaign({
        campaignNumber: newCampaignNumber,
        school: school._id,
        startDate: start,
        endDate: end,
        deliveryDate: delivery,
        isActive: false, // Will be activated after approval
        notes: `Campagne créée le ${new Date().toLocaleDateString('fr-CA')}`,
        profitSplitType: 'absolute', // Always absolute values now
        customPrices: customPrices || [],
        profitSplits: profitSplits || [],
        financialGoal: parseFloat(financialGoal),
        status: 'pending_approval' // Pending Massibec approval
      });

      await newCampaign.save();

      // Update school with new campaign info
      school.currentCampaignNumber = newCampaignNumber;
      school.activeCampaignId = newCampaign._id;

      await school.save();

      res.status(201).json({ 
        message: 'Campagne créée avec succès. En attente d\'approbation de Massibec.',
        campaign: newCampaign
      });

    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ message: 'Erreur lors de la création de la campagne', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
