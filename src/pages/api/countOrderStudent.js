// pages/api/orderStudent.js

import dbConnect from '../../lib/mongodb';
import OrderStudent from '../../models/OrderStudent';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {

    try {
        // Compter le nombre actuel de commandes
        const count = await OrderStudent.countDocuments();
  
        // Générer le nouvel orderId
        const newOrderId = count + 1;

        res.status(201).json(newOrderId);
    } catch (error) {
      console.error('Erreur lors de la création de la commande étudiante:', error);
      res.status(500).json({ message: `Erreur lors de la création de la commande étudiante: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}