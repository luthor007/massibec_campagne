import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
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
        cellulaire,
        organisme,
        titreOuFonction,
        ville,
        codePostal,
        adresse,
        momentPourJoindre
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
        organisme: organisme,
        ville: sanitizeString(ville),
        codePostal: sanitizeString(codePostal),
        telephone: sanitizeString(telephone),
        cellulaire: sanitizeString(cellulaire),
        momentPourJoindre: sanitizeString(momentPourJoindre)
      };

      // Validate required fields
      if (!organisme || !adresse) {
        return res.status(400).json({ 
          message: 'Le nom de l\'école et l\'adresse sont requis' 
        });
      }

      // Create a new School (without initial campaign)
      const newSchool = new School({
        name: sanitizeString(organisme),
        address: sanitizeString(adresse),
        ville: sanitizeString(ville),
        codePostal: sanitizeString(codePostal),
        logo: logoFilename, // Add logo filename
        currentCampaignNumber: 0, // No campaigns initially
        campaigns: [], // Empty campaigns array
        approved: false
      });

      await newSchool.save();

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

      // Create a new product for each isDefault product in my db and copy them but assign them the school that have just been created
      const defaultProducts = await Product.find({ isDefault: true });
      defaultProducts.forEach(async (product) => {
        const newProduct = new Product({
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          image: product.image,
          isDefault: false,
          school: newSchool._id,
        });
        await newProduct.save();
      });

      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${verificationToken}`;
      
      // Confirmation d'inscription de l'école
      // À: responsable, CC: commande@massibec.com
      // De: Campagne Massibec <commande@massibec.com>
      // Objet: Inscription (École xyz) Campagne Massibec
      await sendVerificationEmail({
        to: sanitizedEmail,
        cc: 'commande@massibec.com',
        subject: `Inscription (${sanitizedName}) Campagne Massibec`,
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
