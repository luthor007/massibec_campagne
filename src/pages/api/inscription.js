import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
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
      const { name, email, password, schoolId, objectifPersonnel, parentInfo } = req.body;

      const sanitizedName = sanitizeString(name);
      const sanitizedEmail = sanitizeString(email);
      const sanitizedSchool = schoolId;
      const sanitizedObjectifPersonnel = objectifPersonnel;

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
        school: sanitizedSchool,
        objectifPersonnel: sanitizedObjectifPersonnel,
        role: 'student',
        verificationToken: verificationToken,
        verificationTokenExpires: verificationTokenExpires,
        parentInfo: {
          nomParent: sanitizeString(parentInfo.nomParent),
          prenomParent: sanitizeString(parentInfo.prenomParent),
          adresse: sanitizeString(parentInfo.adresse),
          app: sanitizeString(parentInfo.app),
          ville: sanitizeString(parentInfo.ville),
          province: sanitizeString(parentInfo.province),
          codePostal: sanitizeString(parentInfo.codePostal),
          telephone: sanitizeString(parentInfo.telephone),
        }
      });

      // Save the user in the database
      await user.save();

      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${verificationToken}`;
      const emailSubject = 'Vérifiez votre adresse e-mail';
      
      await sendVerificationEmail({
        to: sanitizedEmail,
        subject: emailSubject,
        firstName: sanitizedName.split(' ')[0], // Assuming first name is the first word
        verificationUrl,
      });

      // Respond with a success message
      res.status(201).json({ message: 'Utilisateur créé avec succès' });
    } catch (error) {
      console.error('Error during registration:', error);
      
      // Check if it's a duplicate email error
      if (error.code === 11000 && error.keyPattern?.email) {
        res.status(400).json({ 
          message: 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter ou utiliser une autre adresse e-mail.',
          code: 'DUPLICATE_EMAIL'
        });
      } else {
        res.status(400).json({ message: 'Erreur lors de l\'inscription' });
      }
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}


