   // src/pages/api/kpis.js
   import dbConnect from '../../lib/mongodb';
   import Order from '../../models/Order';
   import User from '../../models/User';
   import School from '../../models/School';
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

         // Récupérer la période depuis les paramètres de requête ou définir une valeur par défaut
         const { periode = 'mois' } = req.query;
         let periodePrecedente = new Date();

         if (periode === 'semaine') {
           periodePrecedente.setDate(periodePrecedente.getDate() - 7);
         } else if (periode === 'mois') {
           periodePrecedente.setMonth(periodePrecedente.getMonth() - 1);
         } else if (periode === 'annee') {
           periodePrecedente.setFullYear(periodePrecedente.getFullYear() - 1);
         } else {
           return res.status(400).json({ message: 'Période invalide. Choisissez entre semaine, mois, année.' });
         }

         // Récupérer toutes les écoles
         const schools = await School.find().lean();

         // Initialiser le tableau des KPI par école
         const kpis = [];

         for (const school of schools) {
           // Récupérer toutes les commandes de l'école
           const orders = await Order.find({ school: school._id }).lean();

           let totalVentes = 0;
           let beneficesEstimes = 0;
           let totalProduitsVendues = 0;
           const produitsVenduesMap = {};

           orders.forEach(order => {
             totalVentes += order.totalAmount;
             order.products.forEach(productItem => {
               beneficesEstimes += (productItem.productPrice * 0.2) * productItem.quantity;
               totalProduitsVendues += productItem.quantity;

               const productName = productItem.productName || 'Produit Inconnu';
               if (produitsVenduesMap[productName]) {
                 produitsVenduesMap[productName] += productItem.quantity;
               } else {
                 produitsVenduesMap[productName] = productItem.quantity;
               }
             });
           });

           // Transformer le map en tableau
           const productsVendues = Object.keys(produitsVenduesMap).map(productName => ({
             productName,
             quantity: produitsVenduesMap[productName],
           }));

           // Récupérer les commandes de la période précédente
           const ordersPrecedentes = await Order.find({
             school: school._id,
             createdAt: { $gte: periodePrecedente },
           }).lean();

           let totalVentesPrecedente = 0;
           ordersPrecedentes.forEach(order => {
             totalVentesPrecedente += order.totalAmount;
           });

           const croissanceVentes = totalVentesPrecedente === 0 
             ? 0 
             : ((totalVentes - totalVentesPrecedente) / totalVentesPrecedente) * 100;

           // Ajouter les KPI de l'école dans le tableau
           kpis.push({
             schoolId: school._id,
             schoolName: school.name,
             totalVentes,
             beneficesEstimes,
             croissanceVentes: croissanceVentes.toFixed(2),
             totalProduitsVendues,
             productsVendues,
             periode,
           });
         }

         res.status(200).json(kpis);
       } catch (error) {
         console.error('Erreur lors de la récupération des KPI:', error);
         res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
       }
     } else {
       res.setHeader('Allow', ['GET']);
       res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
     }
   }