// src/pages/api/get-store.js
import dbConnect from '../../lib/mongodb';
import Store from '../../models/Store';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    const { userId } = req.body;

    try {
      const store = await Store.findOne({ user: userId });

      if (store) {
        res.status(200).json({ storeId: store._id });
      } else {
        res.status(404).json({ message: 'Store not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}