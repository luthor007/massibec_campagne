import dbConnect from '../../lib/mongodb';
import Order from '../../models/Order';
import { getSession } from 'next-auth/react';
import { products } from '../../lib/product';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      const session = await getSession({ req });
      if (!session) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const orders = await Order.find({ user: userId });

      let totalSales = 0;
      let totalUnits = 0;

      orders.forEach(order => {
        order.products.forEach(item => {
          const product = products.find(p => p.id === item.product.toString());
          if (product) {
            totalSales += product.price * item.quantity;
            totalUnits += item.quantity;
          }
        });
      });

      res.status(200).json({ totalSales, totalUnits, orders });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user orders', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}