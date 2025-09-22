import dbConnect from '../../lib/mongodb';
import Order from '../../models/Order';
import { getToken } from 'next-auth/jwt';
import User from '../../models/User';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = token.sub;
      const user = await User.findOne({ _id: userId });

      if (!user || user.role !== 'school_manager') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const orders = await Order.find({ school: user.schoolManagerInfo.organisme })
        //.populate('products.product');

      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching sales data', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
