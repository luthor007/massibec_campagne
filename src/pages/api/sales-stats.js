// src/pages/api/sales-stats.js
import dbConnect from '../../lib/mongodb';
import Order from '../../models/Order';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  await dbConnect();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  if (req.method === 'GET') {
    try {
      const { storeId } = req.query;
      
      // Statistiques totales
      const totalOrders = await Order.countDocuments({ storeId });
      
      // Statistiques du mois actuel
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const thisMonthOrders = await Order.countDocuments({
        storeId,
        createdAt: { $gte: currentMonth }
      });
      
      // Statistiques du mois précédent pour calculer la croissance
      const lastMonth = new Date(currentMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const lastMonthOrders = await Order.countDocuments({
        storeId,
        createdAt: { $gte: lastMonth, $lt: currentMonth }
      });
      
      // Calcul de la croissance
      const growth = lastMonthOrders > 0 
        ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100)
        : thisMonthOrders > 0 ? 100 : 0;
      
      res.status(200).json({
        total: totalOrders,
        thisMonth: thisMonthOrders,
        growth: growth
      });
    } catch (error) {
      console.error('Error fetching sales stats:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }
}



