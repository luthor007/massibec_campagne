import dbConnect from '@/lib/mongodb';
import School from '@/models/School';
import SchoolManager from '@/models/SchoolManager';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

const sanitizeString = (str) => {
  if (!str) return '';
  return str.normalize('NFC').trim();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const userId = token.sub;
    const user = await User.findById(userId).lean();

    if (!user || user.role !== 'school_manager') {
      return res.status(403).json({ message: 'Seuls les gestionnaires d\'école peuvent créer une école' });
    }

    const { name, address, ville, codePostal, telephone, email } = req.body;

    // Validate required fields
    if (!name || !address || !ville || !codePostal) {
      return res.status(400).json({ message: 'Les champs nom, adresse, ville et code postal sont requis' });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name);
    const sanitizedAddress = sanitizeString(address);
    const sanitizedVille = sanitizeString(ville);
    const sanitizedCodePostal = sanitizeString(codePostal);
    const sanitizedTelephone = sanitizeString(telephone);
    const sanitizedEmail = email ? email.toLowerCase().trim() : '';

    // Validate lengths
    if (sanitizedName.length < 1 || sanitizedName.length > 200) {
      return res.status(400).json({ message: 'Le nom doit contenir entre 1 et 200 caractères' });
    }

    if (sanitizedAddress.length < 1 || sanitizedAddress.length > 200) {
      return res.status(400).json({ message: 'L\'adresse doit contenir entre 1 et 200 caractères' });
    }

    // Create the new school
    const newSchool = new School({
      name: sanitizedName,
      address: sanitizedAddress,
      ville: sanitizedVille,
      codePostal: sanitizedCodePostal,
      telephone: sanitizedTelephone || '',
      email: sanitizedEmail || '',
      currentCampaignNumber: 0,
      campaigns: [],
      approved: false,
      status: 'pending',
      profileCompleted: false,
    });

    await newSchool.save();

    // Create a SchoolManager record for the creator as owner
    const schoolManager = new SchoolManager({
      school: newSchool._id,
      user: userId,
      role: 'owner',
      invitedBy: userId,
      status: 'active',
      joinedAt: new Date(),
    });

    await schoolManager.save();

    res.status(200).json({
      message: 'École créée avec succès',
      school: {
        id: newSchool._id.toString(),
        name: newSchool.name,
        logo: newSchool.logo,
      }
    });

  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
  }
}

