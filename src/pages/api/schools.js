// pages/api/schools.js

import dbConnect from '../../lib/mongodb';
import School from '../../models/School';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const approvedSchools = await School.find({ approved: true });
      res.status(200).json(approvedSchools);
    } catch (error) {
      console.error('Erreur lors de la récupération des écoles:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }
}