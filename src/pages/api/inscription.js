import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '../../utils/gmailMailer';
import crypto from 'crypto'; // Add this import statement


// Sanitize function to handle special characters
const sanitizeString = (str) => {
  return str ? str.normalize('NFC').trim() : str;
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await dbConnect();

      // Destructure and sanitize the fields from the request body
      const { name, email, password, parentInfo } = req.body;

      // Validate required fields
      if (!name || !email || !password || !parentInfo) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
      }

      const sanitizedName = sanitizeString(name);
      const sanitizedEmail = sanitizeString(email);

      // Hash the password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Generate a verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // Token valid for 24 hours

      // Create the new user object with sanitized data
      const user = new User({
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
        role: 'student',
        verificationToken: verificationToken,
        verificationTokenExpires: verificationTokenExpires,
        parentInfo: {
          nomParent: sanitizeString(parentInfo.nomParent),
          prenomParent: sanitizeString(parentInfo.prenomParent),
          telephone: sanitizeString(parentInfo.telephone),
          // Address fields are optional and not required for registration
          adresse: parentInfo.adresse ? sanitizeString(parentInfo.adresse) : undefined,
          app: parentInfo.app ? sanitizeString(parentInfo.app) : undefined,
          ville: parentInfo.ville ? sanitizeString(parentInfo.ville) : undefined,
          province: parentInfo.province ? sanitizeString(parentInfo.province) : undefined,
          codePostal: parentInfo.codePostal ? sanitizeString(parentInfo.codePostal) : undefined,
        }
      });

      // Save the user in the database
      await user.save();

      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${verificationToken}`;
      const parentFullName = `${sanitizeString(parentInfo.prenomParent)} ${sanitizeString(parentInfo.nomParent)}`;
      
      // Confirmation d'inscription du vendeur (étudiant)
      // À: parent
      // De: Campagne Massibec <commande@massibec.com>
      // Objet: Inscription (nom du parent) - Massibec
      await sendVerificationEmail({
        to: sanitizedEmail,
        subject: `Inscription (${parentFullName}) - Massibec`,
        firstName: sanitizeString(parentInfo.prenomParent),
        verificationUrl,
      });

      // Respond with a success message
      res.status(201).json({ message: 'Utilisateur créé avec succès' });
    } catch (error) {
      console.error('Error during registration:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check if it's a duplicate email error
      if (error.code === 11000 && error.keyPattern?.email) {
        res.status(400).json({ 
          message: 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter ou utiliser une autre adresse e-mail.',
          code: 'DUPLICATE_EMAIL'
        });
      } else {
        res.status(400).json({ 
          message: 'Erreur lors de l\'inscription',
          error: error.message,
          details: error.errors || 'No additional details'
        });
      }
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}


