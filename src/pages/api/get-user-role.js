// src/pages/api/getUserRole.js
import dbConnect from '../../lib/mongodb';
import User from '../../models/User';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Connect to the database
      await dbConnect();

      const { email } = req.body;

      // Find the user by email
      const user = await User.findOne({ email });

      if (user) {
        res.status(200).json({ user: user });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user role' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}