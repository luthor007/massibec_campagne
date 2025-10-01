// src/pages/api/resend-verification.js

import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import crypto from 'crypto';
import { sendVerificationEmail } from '../../utils/gmailMailer';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await dbConnect();

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Adresse e-mail requise.' });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ message: 'Aucun utilisateur trouvé avec cette adresse e-mail.' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: 'Votre adresse e-mail est déjà vérifiée.' });
      }

      // Generate a new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // Token valid for 24 hours

      // Update the user with the new token and expiration
      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      await user.save();

      // Send verification email
      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${verificationToken}`;
      const emailSubject = 'Vérifiez votre adresse e-mail - Renouvellement';

      await sendVerificationEmail({
        to: user.email,
        subject: emailSubject,
        firstName: user.name.split(' ')[0],
        verificationUrl,
      });

      res.status(200).json({ message: 'Un nouvel e-mail de vérification a été envoyé.' });
    } catch (error) {
      console.error('Error during resending verification email:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée.' });
  }
}