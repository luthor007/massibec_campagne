import dbConnect from '@/lib/mongodb';
import School from '@/models/School';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const { schoolName } = req.query;

    if (!schoolName) {
      return res.status(400).json({ message: 'Nom de l\'école requis' });
    }

    // Find school by name
    const school = await School.findOne({ name: schoolName });

    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    res.status(200).json({
      name: school.name,
      code: school.code,
      status: school.status,
      approved: school.approved,
      canRegisterStudents: school.status === 'approved'
    });

  } catch (error) {
    console.error('Error checking school status:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
