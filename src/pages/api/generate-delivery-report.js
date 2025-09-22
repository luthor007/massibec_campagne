   // src/pages/api/generate-delivery-report.js
   import dbConnect from '../../lib/mongodb';
   import { getToken } from 'next-auth/jwt';
   import Order from '../../models/Order';
   import OrderStudent from '../../models/OrderStudent';
   import School from '../../models/School';
   import User from '../../models/User';
   import { Parser } from 'json2csv';

   export default async function handler(req, res) {
     if (req.method === 'POST') {
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

         // Récupérer toutes les écoles
         const schools = await School.find().lean();

         const reportData = [];

         const currentDate = new Date();

         for (const school of schools) {
           if (!school.finCampagne) {
             console.warn(`L'école ${school.name} n'a pas de champ 'finCampagne' défini.`);
             continue; // Passer à l'école suivante si finCampagne n'est pas défini
           }

           if (new Date(school.finCampagne) > currentDate) {
             // Campagne en cours : Utiliser le modèle Order
             const orders = await Order.find({ school: school._id }).lean();

             // Agréger les commandes par étudiant et par produit
             const studentProductMap = {};

             orders.forEach(order => {
               const studentKey = `${order.studentName} (${order.email})`; // Identifier unique de l'étudiant

               if (!studentProductMap[studentKey]) {
                 studentProductMap[studentKey] = {
                   schoolName: school.name,
                   studentName: order.studentName,
                   email: order.email,
                   phoneNumber: order.phoneNumber,
                   totalUnits: order.totalUnits,
                   totalAmount: order.totalAmount,
                   beneficesEstimes: 0, // À calculer
                 };
               }

               order.products.forEach(productItem => {
                 if (!studentProductMap[studentKey][productItem.productName]) {
                   studentProductMap[studentKey][productItem.productName] = 0;
                 }
                 studentProductMap[studentKey][productItem.productName] += productItem.quantity;

                 // Calcul des bénéfices estimés
                 studentProductMap[studentKey].beneficesEstimes += (productItem.productPrice - productItem.productCost) * productItem.quantity;
               });
             });

             // Convertir le map en tableau de données
             Object.values(studentProductMap).forEach(studentData => {
               // Ajouter une entrée pour chaque étudiant
               reportData.push({
                 Type: 'Campagne en cours',
                 École: studentData.schoolName,
                 'Nom de l\'étudiant': studentData.studentName,
                 Email: studentData.email,
                 'Numéro de téléphone': studentData.phoneNumber,
                 'Total d\'unités': studentData.totalUnits,
                 'Montant total': studentData.totalAmount.toFixed(2),
                 'Bénéfices estimés': studentData.beneficesEstimes.toFixed(2),
                 'Produits vendus': Object.keys(studentData).filter(key => ['schoolName', 'studentName', 'email', 'phoneNumber', 'totalUnits', 'totalAmount', 'beneficesEstimes'].includes(key) === false).map(product => `${product}: ${studentData[product]}`).join('; '),
               });
             });

           } else {
             // Campagne terminée : Utiliser le modèle OrderStudent
             const orderStudents = await OrderStudent.find({ school: school._id }).lean();

             orderStudents.forEach(orderStudent => {
               reportData.push({
                 Type: 'Campagne terminée',
                 École: school.name,
                 Timestamp: orderStudent.timestamp.toISOString(),
                 Email: orderStudent.email,
                 'Nom de l\'étudiant': orderStudent.studentName,
                 'Numéro de téléphone': orderStudent.phoneNumber,
                 Produits: orderStudent.products.map(p => `${p.productName} (Quantité: ${p.quantity}, Prix unitaire: ${p.price.toFixed(2)}€)`).join('; '),
                 'Total d\'unités': orderStudent.totalUnits,
                 'Montant total': orderStudent.totalAmount.toFixed(2),
                 'Montant payé': orderStudent.amountPaid.toFixed(2),
                 'ID de commande': orderStudent.orderId,
                 'Montant du transfert': orderStudent.transferAmount ? orderStudent.transferAmount.toFixed(2) : 'N/A',
                 'Bénéfice pour l\'élève': orderStudent.studentBenefit.toFixed(2),
                 'Bénéfice pour le tirage': orderStudent.raffleBenefit.toFixed(2),
                 'Bénéfice pour l\'organisation': orderStudent.organizationBenefit.toFixed(2),
                 'Bonus pour l\'organisation': orderStudent.bonusOrganization ? orderStudent.bonusOrganization.toFixed(2) : 'N/A',
                 'Créé le': orderStudent.createdAt.toISOString(),
               });
             });
           }
         }

         if (reportData.length === 0) {
           return res.status(404).json({ message: 'Aucune donnée disponible pour générer le rapport.' });
         }

         // Définir les champs du CSV en fonction des types d'entrées
         const fields = [
           'Type',
           'École',
           'Timestamp',
           'Email',
           'Nom de l\'étudiant',
           'Numéro de téléphone',
           'Produits',
           'Total d\'unités',
           'Montant total',
           'Montant payé',
           'ID de commande',
           'Montant du transfert',
           'Bénéfice pour l\'élève',
           'Bénéfice pour le tirage',
           'Bénéfice pour l\'organisation',
           'Bonus pour l\'organisation',
           'Créé le',
         ];

         const opts = { fields, defaultValue: 'N/A' };
         const parser = new Parser(opts);
         const csv = parser.parse(reportData);

         // Définir les en-têtes pour le téléchargement du fichier CSV
         res.setHeader('Content-Type', 'text/csv');
         res.setHeader('Content-Disposition', 'attachment; filename=delivery_report.csv');
         res.status(200).send(csv);

       } catch (error) {
         console.error('Erreur lors de la génération du rapport de livraison:', error);
         res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
       }
     } else {
       res.setHeader('Allow', ['POST']);
       res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
     }
   }