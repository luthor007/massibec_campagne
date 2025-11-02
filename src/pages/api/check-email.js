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

      // Normalize email the same way as inscription API (remove zero-width chars too)
      const normalizedEmail = email ? email.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, '') : '';
      
      // Check if user exists - try exact match first
      let existingUser = await User.findOne({ email: normalizedEmail });
      
      // If not found, try case-insensitive regex search
      if (!existingUser) {
        const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        existingUser = await User.findOne({ 
          email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') }
        });
      }

      res.status(200).json({ 
        exists: !!existingUser,
        message: existingUser ? 'Email already exists' : 'Email available',
        ...(existingUser && process.env.NODE_ENV === 'development' && {
          debug: {
            existingEmail: existingUser.email,
            role: existingUser.role
          }
        })
      });
    } catch (error) {
      console.error('Error checking email:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}






