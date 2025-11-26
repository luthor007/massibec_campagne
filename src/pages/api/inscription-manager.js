import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import SchoolManager from '../../models/SchoolManager';
import Product from '../../models/Product';
import { sendVerificationEmail } from '../../utils/gmailMailer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Disable Next.js body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Sanitize function to handle special characters
const sanitizeString = (str) => {
  return str ? str.normalize('NFC').trim() : str;
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Starting inscription-manager API call');

      // Connect to the database
      await dbConnect();
      console.log('Database connected successfully');

      // Use multer to handle file upload
      await new Promise((resolve, reject) => {
        upload.single('logo')(req, res, (err) => {
          if (err) {
            console.error('Multer error:', err);
            reject(err);
          } else {
            console.log('File upload processed successfully');
            resolve();
          }
        });
      });

      // Debug: Log what we received
      console.log('Body keys:', Object.keys(req.body));
      console.log('File info:', req.file ? { filename: req.file.filename, size: req.file.size } : 'No file uploaded');

      // Destructure and sanitize the fields from the request body
      const {
        nomComplet,
        email,
        motDePasse,
        telephone,
        organisme,
        titreOuFonction,
        ville,
        codePostal,
        adresse,
        preferredPaymentMethod,
        deliveryInstructions
      } = req.body;

      // Get logo filename if uploaded
      const logoFilename = req.file ? req.file.filename : null;



      // Generate a verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // Token valid for 24 hours

      const sanitizedName = sanitizeString(nomComplet);
      const sanitizedEmail = sanitizeString(email);
      const sanitizedSchoolManagerInfo = {
        titreOuFonction: sanitizeString(titreOuFonction),
        organisme: organisme, // Will be sanitized later
        ville: sanitizeString(ville),
        codePostal: sanitizeString(codePostal),
        telephone: sanitizeString(telephone),
      };

      // Validate required fields
      if (!organisme || !adresse) {
        return res.status(400).json({
          message: 'Le nom de l\'école et l\'adresse sont requis'
        });
      }

      // Additional validation for string fields
      const sanitizedOrganisme = sanitizeString(organisme);
      const sanitizedAddress = sanitizeString(adresse);

      if (!sanitizedOrganisme || sanitizedOrganisme.trim().length === 0 || sanitizedOrganisme.length > 200) {
        return res.status(400).json({
          message: 'Le nom de l\'école doit contenir entre 1 et 200 caractères'
        });
      }

      if (!sanitizedAddress || sanitizedAddress.trim().length === 0 || sanitizedAddress.length > 200) {
        return res.status(400).json({
          message: 'L\'adresse doit contenir entre 1 et 200 caractères'
        });
      }

      // Create a new School (without initial campaign, auto-approved)
      const newSchool = new School({
        name: sanitizedOrganisme.trim(),
        address: sanitizedAddress.trim(),
        ville: sanitizeString(ville).trim(),
        codePostal: sanitizeString(codePostal).trim(),
        logo: logoFilename, // Add logo filename
        telephone: sanitizeString(telephoneEcole) || sanitizeString(telephone) || '', // Use school phone or owner phone
        email: sanitizeString(emailEcole) || sanitizedEmail, // Use school email or owner email
        preferredPaymentMethod: sanitizeString(preferredPaymentMethod), // Add preferred payment method
        deliveryInstructions: sanitizeString(deliveryInstructions), // Add delivery instructions
        currentCampaignNumber: 0, // No campaigns initially
        campaigns: [], // Empty campaigns array
        approved: true, // Auto-approved
        status: 'approved' // Auto-approved
      });

      // Save with error handling for encoding issues
      try {
        await newSchool.save();
      } catch (saveError) {
        console.error('Error saving school:', saveError);

        if (saveError.message && saveError.message.includes('Invalid UTF-8')) {
          return res.status(400).json({
            message: 'Les données contiennent des caractères invalides. Veuillez utiliser uniquement des caractères de texte standard.'
          });
        }

        return res.status(500).json({
          message: 'Erreur lors de la création de l\'école. Veuillez vérifier que toutes les données sont valides.'
        });
      }

      console.log('School created with contact info:', {
        telephone: newSchool.telephone,
        email: newSchool.email
      });

      // Update schoolManagerInfo with the school ID
      sanitizedSchoolManagerInfo.organisme = newSchool._id;


      // Hash the password
      const hashedPassword = bcrypt.hashSync(motDePasse, 10);

      // Create the new user object with sanitized data and associated school
      const newUser = new User({
        email: sanitizedEmail,
        password: hashedPassword,
        name: sanitizedName,
        role: 'school_manager',
        schoolManagerInfo: sanitizedSchoolManagerInfo,
        verificationToken: verificationToken,
        verificationTokenExpires: verificationTokenExpires,
      });

      // Save the user in the database
      await newUser.save();

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

      // Products are now universal and shared across all schools
      // No need to create duplicate products for each school

      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${verificationToken}`;

      // Confirmation d'inscription de l'école
      await sendVerificationEmail({
        to: sanitizedEmail,
        cc: 'alexis@jappuie.ca',
        subject: `Inscription (${sanitizedName}) Jappuie`,
        firstName: sanitizedName.split(' ')[0],
        verificationUrl,
      });

      // Respond with a success message
      console.log('Inscription completed successfully');
      res.status(201).json({ message: 'School and user created successfully' });
    } catch (error) {
      // Handle any errors
      console.error('Error during inscription:', error);

      // Return more specific error information
      if (error.message === 'Only image files are allowed') {
        return res.status(400).json({ message: error.message });
      }

      // Check for specific error types
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
    // Handle invalid HTTP methods
    res.status(405).json({ message: 'Method not allowed' });
  }
}
