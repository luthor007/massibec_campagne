// pages/api/forgot-password.js

import connectDB from '../../lib/mongodb';
import User from '../../models/User';
import PasswordResetToken from '../../models/PasswordResetToken';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../../utils/gmailMailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.setHeader('Allow', ['POST']).status(405).end(`Méthode ${req.method} non autorisée.`);
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'L\'adresse email est requise.' });
  }

  try {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // For security, do not reveal if the email exists
      return res.status(200).json({ message: 'Si un compte avec cet email existe, un lien de réinitialisation a été envoyé.' });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Set token expiration (e.g., 1 hour)
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Save the token to the database
    const resetToken = new PasswordResetToken({
      userId: user._id,
      token,
      expiresAt,
    });

    await resetToken.save();

    // Create reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&id=${user._id}`;

    // Send reset email
    await sendPasswordResetEmail({to:user.email, subject: "Récupération mot de passe", resetLink: resetLink});

    return res.status(200).json({ message: 'Si un compte avec cet email existe, un lien de réinitialisation a été envoyé.' });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation du mot de passe:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}