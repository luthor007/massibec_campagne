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

    // Check if there are modifications to approve
    if (!campaign.massibecModifications) {
      return res.status(400).json({ message: 'Aucune modification à approuver' });
    }

    // Apply the modifications
    campaign.startDate = campaign.massibecModifications.startDate;
    campaign.endDate = campaign.massibecModifications.endDate;
    campaign.deliveryDate = campaign.massibecModifications.deliveryDate;
    campaign.financialGoal = campaign.massibecModifications.financialGoal;
    campaign.profitSplitType = campaign.massibecModifications.profitSplitType;
    campaign.profitSplit = campaign.massibecModifications.profitSplit;

    // Clear the modifications and approve the campaign
    campaign.massibecModifications = undefined;
    campaign.status = 'approved';

    await school.save();

    res.status(200).json({ message: 'Modifications approuvées avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'approbation des modifications:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
