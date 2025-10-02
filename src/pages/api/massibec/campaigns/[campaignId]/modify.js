import dbConnect from '../../../../../lib/mongodb';
import School from '../../../../../models/School';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await dbConnect();

    // Get the token to authenticate the user
    const token = await getToken({ req });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { campaignId } = req.query;
    const {
      startDate,
      endDate,
      deliveryDate,
      financialGoal,
      profitSplitType,
      studentBenefit,
      organizationBenefit,
      raffleBenefit,
      reason
    } = req.body;

    // Find the school that owns this campaign
    const school = await School.findOne({
      'campaigns._id': campaignId
    });

    if (!school) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Find the campaign
    const campaign = school.campaigns.id(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Only allow modifications if campaign is pending approval
    if (campaign.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Seules les campagnes en attente peuvent être modifiées' });
    }

    // Store the proposed modifications
    campaign.massibecModifications = {
      startDate,
      endDate,
      deliveryDate,
      financialGoal: parseFloat(financialGoal),
      profitSplitType,
      profitSplit: {
        studentBenefit: parseFloat(studentBenefit),
        organizationBenefit: parseFloat(organizationBenefit),
        raffleBenefit: parseFloat(raffleBenefit)
      },
      reason,
      modifiedAt: new Date()
    };

    // Update status to indicate Massibec has proposed modifications
    campaign.status = 'pending_school_approval';

    await school.save();

    res.status(200).json({ message: 'Modifications proposées avec succès' });
  } catch (error) {
    console.error('Erreur lors de la proposition de modifications:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
