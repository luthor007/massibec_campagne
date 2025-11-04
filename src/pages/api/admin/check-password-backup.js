// pages/api/admin/check-password-backup.js
// Check if originalPasswordHash exists for a user

import connectDB from '../../../lib/mongodb';
import mongoose from 'mongoose';
import User from '../../../models/User';

export default async function handler(req, res) {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && req.query.secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.setHeader('Allow', ['POST', 'GET']).status(405).end(`Méthode ${req.method} non autorisée.`);
  }

  const email = req.method === 'POST' ? req.body.email : req.query.email;

  if (!email) {
    return res.status(400).json({ message: 'Email requis.' });
  }

  try {
    await connectDB();

    const collection = mongoose.connection.db.collection('users');
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: 'Aucun utilisateur trouvé avec cet email.' });
    }

    // Check directly in MongoDB for originalPasswordHash
    const userDoc = await collection.findOne(
      { _id: user._id },
      { projection: { originalPasswordHash: 1, password: 1, email: 1, name: 1 } }
    );

    return res.status(200).json({
      email: user.email,
      userId: user._id.toString(),
      hasOriginalPasswordBackup: !!userDoc?.originalPasswordHash,
      canRestore: !!userDoc?.originalPasswordHash,
      message: userDoc?.originalPasswordHash 
        ? 'Un backup du mot de passe original existe. Utilisez /api/admin/reset-password-for-testing avec action: "restore" pour le restaurer.'
        : 'Aucun backup du mot de passe original trouvé. L\'utilisateur devra utiliser "Mot de passe oublié" pour réinitialiser son mot de passe.'
    });
  } catch (error) {
    console.error('Error checking password backup:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la vérification.',
      error: error.message 
    });
  }
}
