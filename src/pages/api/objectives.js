   // src/pages/api/objectives.js
   import dbConnect from '../../lib/mongodb';
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

         // Données Mock des Objectives
         const objectivesData = [
           {
             objectif: 'Ventes Mensuelles',
             cible: 20000,
             actuel: 15000,
           },
           {
             objectif: 'Bénéfices Mensuels',
             cible: 8000,
             actuel: 5000,
           },
           {
             objectif: 'Nombre de Commandes',
             cible: 500,
             actuel: 350,
           },
           // Ajoutez d'autres objectifs selon vos besoins
         ];

         res.status(200).json({ objectifs: objectivesData });
       } catch (error) {
         console.error('Erreur lors de la récupération des objectifs:', error);
         res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
       }
     } else {
       res.setHeader('Allow', ['GET']);
       res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
     }
   }