import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import User from '../../../../models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    const user = await User.findById(token.sub);
    if (!user || user.role !== 'fournisseur') {
      return res.status(401).json({ message: 'Non autorisé - rôle fournisseur requis' });
    }

    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ message: 'ID de campagne requis.' });
    }

    // Find school with the campaign
    const school = await School.findOne({ 'campaigns._id': campaignId });
    if (!school) {
      return res.status(404).json({ message: 'Campagne non trouvée.' });
    }

    // Find and update the campaign
    const campaign = school.campaigns.id(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée.' });
    }

    // Toggle the dates lock
    campaign.datesLocked = !campaign.datesLocked;
    await school.save();

    res.status(200).json({ 
      message: `Verrouillage des dates ${campaign.datesLocked ? 'activé' : 'désactivé'}`,
      campaign: campaign.toObject()
    });
  } catch (error) {
    console.error('Error toggling dates lock:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}