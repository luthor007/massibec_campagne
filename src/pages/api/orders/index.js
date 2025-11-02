import connectDB from '../../../lib/mongodb';
import Order from '../../../models/Order';
import User from '../../../models/User';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'POST') {
    try {
      const session = await getSession({ req });
      
      if (!session) {
        return res.status(401).json({ message: 'Non autorisé' });
      }

      const { items, total, customerInfo, isTestOrder, storeId } = req.body;

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Items requis' });
      }

      if (!total || total <= 0) {
        return res.status(400).json({ message: 'Total invalide' });
      }

      // Get user to get order counter
      const user = await User.findById(session.user.id);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Generate order number
      const orderNumber = `CMD-${String(user.orderCounter + 1).padStart(4, '0')}`;

      // Create order
      const order = new Order({
        orderNumber,
        items,
        total,
        customerInfo: customerInfo || {
          name: 'Client Test',
          email: 'test@example.com',
          phone: '123-456-7890'
        },
        status: 'pending',
        isTestOrder: isTestOrder || false,
        storeId: storeId || null,
        ownerId: session.user.id,
        createdAt: new Date()
      });

      await order.save();

      // Update user order counter
      await User.findByIdAndUpdate(session.user.id, {
        $inc: { orderCounter: 1 }
      });

      res.status(201).json({
        message: 'Commande créée avec succès',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          status: order.status,
          isTestOrder: order.isTestOrder
        }
      });

    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  } else if (req.method === 'GET') {
    try {
      const session = await getSession({ req });
      
      if (!session) {
        return res.status(401).json({ message: 'Non autorisé' });
      }

      const { page = 1, limit = 10, status } = req.query;
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);

      // Build query
      let query = { ownerId: session.user.id };
      if (status) {
        query.status = status;
      }

      // Fetch orders with pagination
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

      // Get total count
      const total = await Order.countDocuments(query);

      res.status(200).json({
        orders,
        total,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber)
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}

