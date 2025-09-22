// src/pages/api/paiement.js
import dbConnect from '../../lib/mongodb';
import Order from '../../models/Order';
import User from '../../models/User';
import School from '../../models/School';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  if (req.method === 'POST') {
    try {
      await dbConnect();
      const { orderId } = req.body;
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Commande non trouvée' });
      }
      const user = await User.findById(session.user.id).populate('school');
      const schoolProfit = order.totalAmount * (user.school.profitPercentage / 100);
      const studentProfit = order.totalAmount - schoolProfit;
      
      // Ici, vous devriez implémenter la logique pour envoyer un e-mail avec les instructions de paiement

      order.status = 'completed';
      await order.save();
      
      res.status(200).json({ message: 'Paiement traité avec succès', studentProfit, schoolProfit });
    } catch (error) {
      res.status(400).json({ message: 'Erreur lors du traitement du paiement' });
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}