// src/pages/api/reject-school.js
import dbConnect from '../../lib/mongodb';
import School from '../../models/School';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await dbConnect();

      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas connecté' });
      }

      const { schoolId, reason } = req.body;
      if (!schoolId) {
        return res.status(400).json({ message: 'ID de l\'école est requis.' });
      }

      const school = await School.findById(schoolId);
      if (!school) {
        return res.status(404).json({ message: 'École non trouvée.' });
      }

      school.approved = false;
      school.status = 'rejected';
      school.isActive = false;
      school.rejectionReason = reason || '';
      school.rejectedAt = new Date();
      await school.save();

      res.status(200).json({ message: 'École rejetée avec succès.' });
    } catch (error) {
      console.error('Error rejecting school:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }
}