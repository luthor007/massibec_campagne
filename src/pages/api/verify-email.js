// src/pages/api/verify-email.js

import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      const { token } = req.query;

      if (!token) {
        return res.redirect(`${process.env.NEXTAUTH_URL}/email-verification-error`);
      }

      // Find the user with the matching verification token and ensure the token hasn't expired
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.redirect(`${process.env.NEXTAUTH_URL}/email-verification-error`);
      }

      // Update the user's emailVerified status and remove the verification token
      user.emailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      // Generate a temporary login token for automatic sign-in
      const loginToken = crypto.randomBytes(32).toString('hex');
      const loginTokenExpires = Date.now() + 5 * 60 * 1000; // Valid for 5 minutes
      
      // Store the login token in the user record temporarily
      user.loginToken = loginToken;
      user.loginTokenExpires = loginTokenExpires;
      user.loginTokenUsed = 0; // Initialize use counter
      await user.save();

      // Redirect to email-verified page with the login token and user name
      const userName = encodeURIComponent(user.name);
      res.redirect(`${process.env.NEXTAUTH_URL}/email-verified?token=${loginToken}&userId=${user._id}&name=${userName}`);
    } catch (error) {
      console.error('Error during email verification:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée.' });
  }
}