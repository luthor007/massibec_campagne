import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import { sendVerificationEmail } from '../../utils/gmailMailer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Sanitize function to handle special characters
const sanitizeString = (str) => {
  return str ? str.normalize('NFC').trim() : str;
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Connect to the database
      await dbConnect();

      // Destructure and sanitize the fields from the request body
      const {
        nomComplet,
        email,
        motDePasse,
        confirmationMotDePasse
      } = req.body;

      // Sanitize inputs
      const sanitizedName = sanitizeString(nomComplet);
      const sanitizedEmail = email.toLowerCase().trim(); // Use same logic as check-email API

      // Check if email already exists
      const existingUser = await User.findOne({ email: sanitizedEmail });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Cette adresse e-mail est déjà utilisée.' });
      }

      // Generate a verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // Token valid for 24 hours

      // Create a minimal School (will be completed later)
      const newSchool = new School({
        name: 'École à compléter', // Placeholder
        address: 'Adresse à compléter', // Placeholder
        ville: 'Ville à compléter', // Placeholder
        codePostal: 'Code postal à compléter', // Placeholder
        currentCampaignNumber: 0,
        campaigns: [],
        approved: false,
        profileCompleted: false // Flag to track if profile is complete
      });

      await newSchool.save();

      // Hash the password
      const hashedPassword = bcrypt.hashSync(motDePasse, 10);

      // Create the new user object with minimal data
      const newUser = new User({
        email: sanitizedEmail,
        password: hashedPassword,
        name: sanitizedName,
        role: 'school_manager',
        schoolManagerInfo: {
          titreOuFonction: 'À compléter',
          organisme: newSchool._id,
          ville: 'À compléter',
          codePostal: 'À compléter',
          telephone: 'À compléter',
          cellulaire: 'À compléter',
          momentPourJoindre: 'À compléter'
        },
        verificationToken: verificationToken,
        verificationTokenExpires: verificationTokenExpires,
        profileCompleted: false // Flag to track if profile is complete
      });

      await newUser.save();

      // Send verification email
      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${verificationToken}`;
      
      await sendVerificationEmail({
        to: sanitizedEmail,
        cc: 'commande@massibec.com',
        subject: `Inscription (${sanitizedName}) Campagne Massibec`,
        firstName: sanitizedName.split(' ')[0],
        verificationUrl,
      });

      res.status(201).json({ 
        message: 'Compte créé avec succès. Vérifiez votre e-mail pour confirmer votre compte.',
        userId: newUser._id,
        schoolId: newSchool._id
      });
    } catch (error) {
      console.error('Error during simple inscription:', error);
      
      // Return more specific error information
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          message: 'Erreur de validation des données', 
          details: error.message 
        });
      }
      
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'Cette adresse e-mail est déjà utilisée' 
        });
      }
      
      // Generic error response
      res.status(500).json({ 
        message: 'Erreur interne du serveur', 
        error: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Méthode ${req.method} non autorisée.`);
  }
}
