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
      const {
        organisme,
        adresse,
        ville,
        codePostal,
        titreOuFonction,
        telephone,
        cellulaire,
        momentPourJoindre
      } = req.body;

      // Get user and school
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      const school = await School.findById(user.schoolManagerInfo.organisme);
      if (!school) {
        return res.status(404).json({ message: 'École non trouvée' });
      }

      // Update school information
      await School.findByIdAndUpdate(school._id, {
        name: organisme,
        address: adresse,
        ville: ville,
        codePostal: codePostal,
        profileCompleted: true
      });

      // Update user school manager info
      await User.findByIdAndUpdate(userId, {
        'schoolManagerInfo.titreOuFonction': titreOuFonction,
        'schoolManagerInfo.telephone': telephone,
        'schoolManagerInfo.cellulaire': cellulaire,
        'schoolManagerInfo.momentPourJoindre': momentPourJoindre,
        profileCompleted: true,
        profileCompletionPercentage: 100
      });

      res.status(200).json({ 
        message: 'Profil complété avec succès',
        profileCompleted: true
      });
    } catch (error) {
      console.error('Error completing profile:', error);
      res.status(500).json({ message: 'Erreur lors de la sauvegarde' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
