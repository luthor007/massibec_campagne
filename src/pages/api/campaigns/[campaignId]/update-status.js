import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import User from '../../../../models/User';
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
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending_approval', 'approved', 'rejected', 'active', 'completed', 'pending_school_approval'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    // Find the school that owns this campaign
    const school = await School.findOne({
      'campaigns._id': campaignId
    });

    if (!school) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if the user is a supplier/admin (only suppliers can change campaign status)
    const user = await User.findById(token.sub);
    const isMassibec = user && user.role === 'fournisseur';

    if (!isMassibec) {
      return res.status(403).json({ message: 'Seuls les administrateurs Jappuie.ca peuvent modifier le statut des campagnes' });
    }

    // Find the campaign
    const campaign = school.campaigns.id(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Update campaign status
    campaign.status = status;

    // If activating a campaign, deactivate others
    if (status === 'active') {
      school.campaigns.forEach(c => {
        if (c._id.toString() !== campaignId) {
          c.isActive = false;
        }
      });
      campaign.isActive = true;
    } else {
      campaign.isActive = false;
    }

    await school.save();

    res.status(200).json({
      message: 'Statut de la campagne mis à jour avec succès',
      campaign: campaign.toObject()
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de la campagne:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}