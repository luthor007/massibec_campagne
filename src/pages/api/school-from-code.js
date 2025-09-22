// pages/api/schools.js

import dbConnect from '../../lib/mongodb';
import School from '../../models/School';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { code } = req.query;
      const school = await School.findOne({ approved: true, code: code });
      
      if (!school) {
        return res.status(404).json({ message: 'École non trouvée avec ce code.' });
      }
      
      res.status(200).json(school);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'école:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }
}