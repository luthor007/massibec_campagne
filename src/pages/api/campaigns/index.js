import dbConnect from '../../../lib/mongodb';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import User from '../../../models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method === 'GET') {
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

      // Find the school
      const school = await School.findById(user.schoolManagerInfo.organisme);
      if (!school) {
        return res.status(404).json({ message: 'École non trouvée' });
      }

      // Get all campaigns for this school
      const campaigns = await Campaign.find({ school: school._id })
        .populate('customPrices.productId', 'name price cost image')
        .populate('profitSplits.productId', 'name')
        .sort({ campaignNumber: -1 }); // Most recent first

      res.status(200).json({ campaigns });

    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des campagnes', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
