import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
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
      const User = require('../../../models/User');
      const user = await User.findById(userId).lean();

      if (!user || user.role !== 'school_manager') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        startDate,
        endDate,
        deliveryDate,
        financialGoal,
        profitSplitType,
        studentBenefit,
        organizationBenefit,
        raffleBenefit
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

      // Validate profit split percentages
      if (profitSplitType === 'percentage') {
        const total = parseFloat(studentBenefit) + parseFloat(organizationBenefit) + parseFloat(raffleBenefit);
        if (Math.abs(total - 100) > 0.01) {
          return res.status(400).json({ message: 'Les pourcentages doivent totaliser 100%' });
        }
      }

      // Find the school
      const school = await School.findById(user.schoolManagerInfo.organisme);
      if (!school) {
        return res.status(404).json({ message: 'École non trouvée' });
      }

      // Create new campaign
      const newCampaignNumber = school.currentCampaignNumber + 1;
      
      const newCampaign = {
        campaignNumber: newCampaignNumber,
        startDate: start,
        endDate: end,
        deliveryDate: delivery,
        isActive: false, // Will be activated after approval
        notes: `Campagne créée le ${new Date().toLocaleDateString('fr-CA')}`,
        profitSplitType: profitSplitType,
        profitSplit: {
          studentBenefit: parseFloat(studentBenefit),
          organizationBenefit: parseFloat(organizationBenefit),
          raffleBenefit: parseFloat(raffleBenefit)
        },
        financialGoal: parseFloat(financialGoal),
        status: 'pending_approval' // Pending Massibec approval
      };

      // Add the new campaign to the school
      school.campaigns.push(newCampaign);
      school.currentCampaignNumber = newCampaignNumber;
      school.objectifFinancier = financialGoal;

      // Update the main campaign dates (will be activated after approval)
      school.debutCampagne = start;
      school.finCampagne = end;
      school.dateDeLivraison = delivery;

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
