import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import SchoolManager from '../../models/SchoolManager';
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

      // Validate required fields
      if (!nomComplet || !email || !motDePasse || !confirmationMotDePasse) {
        return res.status(400).json({ 
          message: 'Tous les champs sont requis',
          missingFields: {
            nomComplet: !nomComplet,
            email: !email,
            motDePasse: !motDePasse,
            confirmationMotDePasse: !confirmationMotDePasse
          }
        });
      }

      // Validate password confirmation
      if (motDePasse !== confirmationMotDePasse) {
        return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
      }

      // Sanitize inputs
      const sanitizedName = sanitizeString(nomComplet);
      // Normalize email: lowercase and trim (consistent across all APIs)
      // Also remove any zero-width characters that might cause issues
      const sanitizedEmail = email ? email.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, '') : '';

      console.log('Registration attempt:', {
        originalEmail: email,
        sanitizedEmail: sanitizedEmail,
        emailLength: sanitizedEmail.length,
        emailBytes: Buffer.from(sanitizedEmail).toString('hex')
      });

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        return res.status(400).json({ message: 'Format d\'email invalide.' });
      }

      // Check if email already exists - try multiple approaches
      // 1. Exact match first (most common case)
      let existingUser = await User.findOne({ email: sanitizedEmail });
      
      // 2. If not found, try case-insensitive regex search
      if (!existingUser) {
        const escapedEmail = sanitizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        existingUser = await User.findOne({ 
          email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') }
        });
      }
      
      // 3. If still not found, get all users and check manually (fallback)
      // This is needed because MongoDB unique index might be case-sensitive depending on collation
      if (!existingUser) {
        const allUsers = await User.find({}, 'email role emailVerified').lean();
        const foundUser = allUsers.find(u => {
          if (!u.email) return false;
          const normalizedExisting = u.email.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
          return normalizedExisting === sanitizedEmail;
        });
        
        if (foundUser) {
          existingUser = await User.findById(foundUser._id);
        }
      }
      
      if (existingUser) {
        const emailMatch = existingUser.email.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, '') === sanitizedEmail;
        
        console.error('Email already exists:', {
          requestedEmail: sanitizedEmail,
          requestedEmailBytes: Buffer.from(sanitizedEmail).toString('hex'),
          existingEmail: existingUser.email,
          existingEmailBytes: Buffer.from(existingUser.email).toString('hex'),
          existingUserId: existingUser._id.toString(),
          existingUserRole: existingUser.role,
          emailVerified: existingUser.emailVerified,
          emailsMatch: emailMatch,
          normalizedMatch: existingUser.email.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, '') === sanitizedEmail
        });
        
        // If email exists but is not verified and was created more than 24 hours ago, 
        // we could allow re-registration, but for now just show the error
        return res.status(400).json({ 
          message: 'Cette adresse e-mail est déjà utilisée.',
          ...(process.env.NODE_ENV === 'development' && {
            debug: {
              requested: sanitizedEmail,
              existing: existingUser.email,
              userId: existingUser._id.toString(),
              role: existingUser.role,
              verified: existingUser.emailVerified
            }
          })
        });
      }
      
      console.log('Email check passed - no existing user found for:', sanitizedEmail);

      // Generate a verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // Token valid for 24 hours

      // Create a unique placeholder name for the school (avoid duplicate key on name index)
      const schoolPlaceholderSuffix = crypto.randomBytes(4).toString('hex');
      const schoolPlaceholderName = `École à compléter ${schoolPlaceholderSuffix}`;
      const schoolPlaceholderAddress = `Adresse à compléter ${schoolPlaceholderSuffix}`;

      // Create a minimal School (will be completed later)
      const newSchool = new School({
        name: schoolPlaceholderName, // Placeholder with unique suffix
        address: schoolPlaceholderAddress, // Placeholder with unique suffix
        ville: 'Ville à compléter', // Placeholder
        codePostal: 'À compléter', // Placeholder (maxlength: 20)
        currentCampaignNumber: 0,
        campaigns: [],
        approved: false,
        profileCompleted: false // Flag to track if profile is complete
      });

      await newSchool.save();

      // Hash the password
      const hashedPassword = bcrypt.hashSync(motDePasse, 10);

      // Double-check before creating user (prevent race condition)
      const finalCheck = await User.findOne({ 
        email: sanitizedEmail 
      });
      if (finalCheck) {
        console.error('Race condition detected - email found on final check:', {
          email: sanitizedEmail,
          existingUserId: finalCheck._id.toString()
        });
        return res.status(400).json({ 
          message: 'Cette adresse e-mail est déjà utilisée.',
          code: 'EMAIL_EXISTS'
        });
      }

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

      try {
        await newUser.save();
      } catch (saveError) {
        // If save fails with duplicate key error, check what email actually exists
        if (saveError.code === 11000) {
          const duplicateEmail = saveError.keyValue?.email;
          console.error('MongoDB duplicate key error on save:', {
            attemptedEmail: sanitizedEmail,
            duplicateEmail: duplicateEmail,
            keyPattern: saveError.keyPattern
          });
          
          // Verify the duplicate email actually matches
          const duplicateUser = await User.findOne({ email: duplicateEmail || sanitizedEmail });
          if (duplicateUser) {
            return res.status(400).json({ 
              message: 'Cette adresse e-mail est déjà utilisée.',
              code: 'DUPLICATE_KEY'
            });
          }
          
          // If we can't find the duplicate, it's a weird MongoDB issue
          return res.status(500).json({ 
            message: 'Erreur lors de la création du compte. Veuillez réessayer.',
            code: 'SAVE_ERROR'
          });
        }
        // Re-throw if it's not a duplicate key error
        throw saveError;
      }

      // Create SchoolManager record to make this user the owner
      const schoolManager = new SchoolManager({
        school: newSchool._id,
        user: newUser._id,
        role: 'owner',
        invitedBy: newUser._id, // Self-invited as the creator
        status: 'active'
      });
      await schoolManager.save();

      console.log('SchoolManager created:', {
        schoolId: newSchool._id,
        userId: newUser._id,
        role: 'owner'
      });

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
      console.error('Error details:', {
        name: error.name,
        code: error.code,
        message: error.message,
        stack: error.stack,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      });
      
      // Return more specific error information
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          message: 'Erreur de validation des données', 
          details: error.message,
          errors: error.errors
        });
      }
      
      // MongoDB duplicate key error (unique constraint violation)
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'email';
        console.error('Duplicate key error:', {
          field,
          value: error.keyValue?.[field],
          existingValue: error.keyValue
        });
        return res.status(400).json({ 
          message: 'Cette adresse e-mail est déjà utilisée',
          field: field
        });
      }
      
      // Generic error response with more details in development
      res.status(500).json({ 
        message: 'Erreur interne du serveur', 
        error: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          code: error.code,
          name: error.name
        })
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Méthode ${req.method} non autorisée.`);
  }
}
