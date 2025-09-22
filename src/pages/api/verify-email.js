// src/pages/api/verify-email.js

import dbConnect from '../../lib/mongodb';
import User from '../../models/User';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ message: 'Token de vérification manquant.' });
      }

      // Find the user with the matching verification token and ensure the token hasn't expired
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ message: 'Token de vérification invalide ou expiré.' });
      }

      // Update the user's emailVerified status and remove the verification token
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      // Optionally, you can redirect the user to a success page or send a response
      // For example, redirect to a frontend page:
      res.redirect(`${process.env.NEXTAUTH_URL}/email-verified`);

      // Or send a JSON response:
      // res.status(200).json({ message: 'Votre adresse e-mail a été vérifiée avec succès.' });
    } catch (error) {
      console.error('Error during email verification:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée.' });
  }
}