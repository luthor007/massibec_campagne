// pages/api/reset-password.js

import connectDB from '../../lib/mongodb';
import User from '../../models/User';
import PasswordResetToken from '../../models/PasswordResetToken';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.setHeader('Allow', ['POST']).status(405).end(`Méthode ${req.method} non autorisée.`);
  }

  const { userId, token, newPassword } = req.body;

  if (!userId || !token || !newPassword) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }

  try {
    await connectDB();

    // Find the reset token
    const resetTokenDoc = await PasswordResetToken.findOne({ userId, token });

    if (!resetTokenDoc) {
      return res.status(400).json({ message: 'Token de réinitialisation invalide ou expiré.' });
    }

    if (resetTokenDoc.expiresAt < new Date()) {
      // Token expired
      await PasswordResetToken.deleteOne({ _id: resetTokenDoc._id }); // Delete expired token
      return res.status(400).json({ message: 'Token de réinitialisation expiré.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    // Delete the used token
    await PasswordResetToken.deleteOne({ _id: resetTokenDoc._id });

    return res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}