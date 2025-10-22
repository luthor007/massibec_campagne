import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
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
      const { profileCompleted, completionPercentage } = req.body;

      // Update user profile status
      await User.findByIdAndUpdate(userId, {
        profileCompleted: profileCompleted || false,
        profileCompletionPercentage: completionPercentage || 0
      });

      res.status(200).json({ message: 'Statut du profil mis à jour' });
    } catch (error) {
      console.error('Error updating profile status:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
