// /pages/api/updateProfile.js

import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await dbConnect();
    
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const userId = token.sub;
    const { name, email, telephone } = req.body;

    // Update fields
    const updateData = {
      ...(name && { name }),
      ...(email && { email }),
      ...(telephone && { 'parentInfo.telephone': telephone }),
    };

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.status(200).json({ message: 'Profil mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
  }
}