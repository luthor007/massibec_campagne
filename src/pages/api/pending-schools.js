   // src/pages/api/pending-schools.js
   import dbConnect from '../../lib/mongodb';
   import School from '../../models/School';
   import User from '../../models/User';
   import { getToken } from 'next-auth/jwt';

   export default async function handler(req, res) {
     if (req.method === 'GET') {
       try {
         await dbConnect();

         // Authentification et Autorisation
         const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
         if (!token) {
           return res.status(401).json({ message: 'Non autorisé, pas connecté' });
         }

         const userId = token.sub;
         const user = await User.findById(userId);

         if (!user || user.role !== 'fournisseur') {
           return res.status(401).json({ message: 'Non autorisé' });
         }

         // Récupérer toutes les écoles non approuvées
         const pendingSchools = await School.find({ approved: false }).lean();

         res.status(200).json(pendingSchools);
       } catch (error) {
         console.error('Erreur lors de la récupération des écoles en attente:', error);
         res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
       }
     } else {
       res.setHeader('Allow', ['GET']);
       res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
     }
   }