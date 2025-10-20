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
    const { customPrices } = req.body;

    if (!campaignId) {
      return res.status(400).json({ message: 'ID de campagne requis.' });
    }

    if (!Array.isArray(customPrices)) {
      return res.status(400).json({ message: 'customPrices doit être un tableau.' });
    }

    // Find school with the campaign
    const school = await School.findOne({ 'campaigns._id': campaignId });
    if (!school) {
      return res.status(404).json({ message: 'Campagne non trouvée.' });
    }

    // Find the campaign
    const campaign = school.campaigns.id(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée.' });
    }

    // Validate custom prices
    for (const customPrice of customPrices) {
      if (!customPrice.productId || typeof customPrice.price !== 'number' || customPrice.price < 0) {
        return res.status(400).json({ 
          message: 'Chaque prix personnalisé doit avoir un productId valide et un prix positif.' 
        });
      }
    }

    // Update custom prices
    campaign.customPrices = customPrices;
    await school.save();

    res.status(200).json({ 
      message: 'Prix personnalisés mis à jour avec succès',
      customPrices: campaign.customPrices
    });
  } catch (error) {
    console.error('Error updating custom prices:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}









