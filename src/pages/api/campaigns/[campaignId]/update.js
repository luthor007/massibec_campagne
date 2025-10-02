import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await dbConnect();

    // Get the session to authenticate the user
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
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
      raffleBenefit
    } = req.body;

    // Find the school that owns this campaign
    const school = await School.findOne({
      'campaigns._id': campaignId
    });

    if (!school) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if the user is the school manager
    if (school._id.toString() !== session.user.schoolManagerInfo?.organisme?.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Find the campaign
    const campaign = school.campaigns.id(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Only allow editing if campaign is pending approval
    if (campaign.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Seules les campagnes en attente peuvent être modifiées' });
    }

    // Update campaign details
    campaign.startDate = startDate;
    campaign.endDate = endDate;
    campaign.deliveryDate = deliveryDate;
    campaign.financialGoal = financialGoal;
    campaign.profitSplitType = profitSplitType;
    campaign.profitSplit = {
      studentBenefit: parseFloat(studentBenefit),
      organizationBenefit: parseFloat(organizationBenefit),
      raffleBenefit: parseFloat(raffleBenefit)
    };

    await school.save();

    res.status(200).json({ message: 'Campagne mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la campagne:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
