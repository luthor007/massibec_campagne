// pages/api/admin/reset-password-for-testing.js
// ⚠️ TEMPORARY ADMIN ENDPOINT FOR TESTING ONLY
// This should be removed or secured before production

import connectDB from '../../../lib/mongodb';
import mongoose from 'mongoose';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && req.query.secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (req.method !== 'POST') {
    return res.setHeader('Allow', ['POST']).status(405).end(`Méthode ${req.method} non autorisée.`);
  }

  const { email, newPassword, action } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email requis.' });
  }

  try {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: 'Aucun utilisateur trouvé avec cet email.' });
    }

    // Action: 'set' = définir un mot de passe temporaire, 'restore' = restaurer l'ancien
    if (action === 'set') {
      // Sauvegarder l'ancien mot de passe si ce n'est pas déjà fait
      // Use MongoDB update directly to ensure it's saved even if validation fails
      const collection = mongoose.connection.db.collection('users');
      
      // Check if originalPasswordHash already exists in the database
      const existingDoc = await collection.findOne(
        { _id: user._id },
        { projection: { originalPasswordHash: 1 } }
      );
      
      if (!existingDoc?.originalPasswordHash) {
        // Save the original password hash directly to MongoDB
        await collection.updateOne(
          { _id: user._id },
          { $set: { originalPasswordHash: user.password } }
        );
        console.log(`⚠️ ADMIN: Saved original password hash for ${email}`);
      }

      if (!newPassword) {
        return res.status(400).json({ message: 'Nouveau mot de passe requis pour action "set".' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update the user's password
      user.password = hashedPassword;
      await user.save();

      console.log(`⚠️ ADMIN PASSWORD SET: Temporary password set for ${email} (User ID: ${user._id})`);

      return res.status(200).json({ 
        message: 'Mot de passe temporaire défini avec succès. L\'ancien mot de passe a été sauvegardé.',
        email: user.email,
        userId: user._id.toString(),
        role: user.role,
        originalPasswordSaved: true
      });
    } else if (action === 'restore') {
      // Restaurer l'ancien mot de passe
      // Read originalPasswordHash directly from MongoDB
      const collection = mongoose.connection.db.collection('users');
      const userDoc = await collection.findOne(
        { _id: user._id },
        { projection: { originalPasswordHash: 1, password: 1 } }
      );
      
      if (!userDoc || !userDoc.originalPasswordHash) {
        return res.status(400).json({ message: 'Aucun mot de passe original sauvegardé pour cet utilisateur.' });
      }

      // Restore using MongoDB update directly (bypass Mongoose validation)
      await collection.updateOne(
        { _id: user._id },
        { 
          $set: { password: userDoc.originalPasswordHash },
          $unset: { originalPasswordHash: "" }
        }
      );
      
      console.log(`⚠️ ADMIN: Restored original password hash for ${email}`);

      console.log(`⚠️ ADMIN PASSWORD RESTORE: Original password restored for ${email} (User ID: ${user._id})`);

      return res.status(200).json({ 
        message: 'Mot de passe original restauré avec succès.',
        email: user.email,
        userId: user._id.toString(),
        role: user.role
      });
    } else {
      return res.status(400).json({ message: 'Action invalide. Utilisez "set" pour définir un mot de passe temporaire ou "restore" pour restaurer l\'ancien.' });
    }
  } catch (error) {
    console.error('Erreur lors de la manipulation du mot de passe:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}
