// src/pages/api/check-email-verification.js

import dbConnect from '../../lib/mongodb';
import User from '../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ 
      emailVerified: user.emailVerified || false,
      userId: user._id,
      loginToken: user.loginToken,
      loginTokenExpires: user.loginTokenExpires,
      userEmail: user.email
    });
  } catch (error) {
    console.error('Error checking email verification:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

