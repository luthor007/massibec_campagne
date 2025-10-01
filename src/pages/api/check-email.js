import dbConnect from '../../lib/mongodb';
import User from '../../models/User';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await dbConnect();

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

      res.status(200).json({ 
        exists: !!existingUser,
        message: existingUser ? 'Email already exists' : 'Email available'
      });
    } catch (error) {
      console.error('Error checking email:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
