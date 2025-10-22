import dbConnect from '../../../lib/mongodb';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import User from '../../../models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      const { campaignId } = req.query;

      if (!campaignId) {
        return res.status(400).json({ message: 'Campaign ID is required' });
      }

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

      // Find the campaign
      const campaign = await Campaign.findById(campaignId)
        .populate('school', 'name address ville codePostal logo')
        .populate('customPrices.productId', 'name price cost image')
        .populate('profitSplits.productId', 'name');

      if (!campaign) {
        return res.status(404).json({ message: 'Campagne non trouvée' });
      }

      // Verify the campaign belongs to the user's school
      if (campaign.school._id.toString() !== user.schoolManagerInfo.organisme.toString()) {
        return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
      }

      res.status(200).json({ campaign });

    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération de la campagne', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
