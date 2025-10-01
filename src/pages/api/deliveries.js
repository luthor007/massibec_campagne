   // src/pages/api/deliveries.js
   import dbConnect from '../../lib/mongodb';
   import { getToken } from 'next-auth/jwt';
   import Order from '../../models/Order';
   import School from '../../models/School';
   import User from '../../models/User';

   export default async function handler(req, res) {
     if (req.method === 'GET') {
       try {
         await dbConnect();

         const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
         if (!token) {
           return res.status(401).json({ message: 'Non autorisé, pas connecté' });
         }

         const userId = token.sub;
         const user = await User.findById(userId);

         if (!user || user.role !== 'fournisseur') {
           return res.status(401).json({ message: 'Non autorisé' });
         }

         // Récupérer toutes les écoles
         const schools = await School.find().lean();

         const livraisons = [];

         for (const school of schools) {
           // Récupérer toutes les commandes de l'école
           const orders = await Order.find({ school: school._id }).lean();

           orders.forEach(order => {
           livraisons.push({
              _id: order._id,
              user: order.user,
              store: order.store,
              school: school.name,
               schoolId: school._id,
              customerName: order.customerName,
               customerEmail: order.customerEmail,
               customerPhone: order.phoneNumber,
               totalAmount: order.totalAmount,
               createdAt: order.createdAt,
               status: order.status,
              orderId: order.orderId,
               campaignNumber: order.campaignNumber || null,
              tip: order.tip,
               discount: order.discount,
               products: order.products,
               ecole: school.name,
               produit: order.products.map(p => p.productName).join(', '),
               quantite: order.products.reduce((acc, p) => acc + p.quantity, 0),
               dateEstimee: school.dateDeLivraison 
                 ? new Date(school.dateDeLivraison).toISOString().split('T')[0]
                 : 'N/A',
             });
           });
         }

         res.status(200).json(livraisons);
       } catch (error) {
         console.error('Erreur lors de la récupération des livraisons:', error);
         res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
       }
     } else {
       res.setHeader('Allow', ['GET']);
       res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
     }
   }
