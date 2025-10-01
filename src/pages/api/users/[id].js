// pages/api/schools/[id].js

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
  const name = req.query;

  await dbConnect();

  if (req.method === 'GET') {
    try {
        console.log(name)
      
      // Special case for example user with ID "000000000000000000000001"
      if (name.id === '000000000000000000000001') {
        const exampleUser = {
          _id: '000000000000000000000001',
          name: 'Élève Exemple',
          email: 'exemple@massibec.com',
          school: '671eea6a50059d84409666fa', // Chavigny school ID
          role: 'student',
          parentInfo: {
            nomParent: 'Parent Exemple',
            prenomParent: 'Jean',
            adresse: '123 rue Exemple',
            ville: 'Trois-Rivières',
            province: 'QC',
            codePostal: 'G8Z 1A1',
            telephone: '(819) 123-4567'
          },
          objectifPersonnel: 20,
          emailVerified: true
        };
        return res.status(200).json(exampleUser);
      }
      
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