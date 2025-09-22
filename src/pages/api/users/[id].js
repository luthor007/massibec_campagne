// pages/api/schools/[id].js

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
  const name = req.query;

  await dbConnect();

  if (req.method === 'GET') {
    try {
        console.log(name)
      const user = await User.findById(name.id);
      if (!user) {
        return res.status(404).json({ message: 'User non trouvée.' });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error('Erreur lors de la récupération de User:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}