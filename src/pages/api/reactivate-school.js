import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import School from '@/models/School';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = await getToken({ req });
    if (!token) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    // Check if user is supplier/admin (fournisseur)
    if (token.role !== 'fournisseur') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await dbConnect();

    const { schoolId } = req.body;

    if (!schoolId) {
      return res.status(400).json({ message: 'ID de l\'école requis' });
    }

    // Find and reactivate the school
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    // Reactivate the school
    school.isActive = true;
    school.status = 'approved'; // Reset status to approved when reactivating
    school.deactivatedAt = undefined;
    school.deactivationReason = undefined;

    await school.save();

    res.status(200).json({
      message: 'École réactivée avec succès',
      school: school.toObject()
    });

  } catch (error) {
    console.error('Error reactivating school:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}