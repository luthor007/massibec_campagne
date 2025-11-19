import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { name, email, telephone } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Le nom et l\'email sont requis' });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase().trim(),
      _id: { $ne: token.sub }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Cette adresse email est déjà utilisée' });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      token.sub,
      {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        telephone: telephone?.trim() || ''
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.status(200).json({
      message: 'Paramètres personnels sauvegardés avec succès',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        telephone: updatedUser.telephone
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}



