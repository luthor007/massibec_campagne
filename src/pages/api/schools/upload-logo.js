import dbConnect from '@/lib/mongodb';
import School from '@/models/School';
import SchoolManager from '@/models/SchoolManager';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';
import multer from 'multer';
import cloudinary from '@/utils/cloudinary';

// Configure multer for memory storage (Cloudinary needs buffer)
const upload = multer({
  storage: multer.memoryStorage(),
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

    // Use multer to handle file upload
    await new Promise((resolve, reject) => {
      upload.single('logo')(req, res, (err) => {
        if (err) {
          console.error('Multer error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const { schoolId } = req.body;
    const logoFile = req.file;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID requis' });
    }

    if (!logoFile) {
      return res.status(400).json({ message: 'Aucun fichier logo fourni' });
    }

    // Upload to Cloudinary
    const uploadStr = logoFile.buffer.toString('base64');
    console.log('Uploading to Cloudinary, file size:', logoFile.buffer.length);
    
    const uploadResult = await cloudinary.uploader.upload(
      `data:${logoFile.mimetype};base64,${uploadStr}`,
      {
        folder: 'school-logo',
        resource_type: 'image',
        transformation: [
          { width: 500, height: 500, crop: 'limit' }
        ]
      }
    );

    const cloudinaryUrl = uploadResult.secure_url;
    const cloudinaryPublicId = uploadResult.public_id;
    
    console.log('Cloudinary upload result:', {
      url: cloudinaryUrl,
      publicId: cloudinaryPublicId
    });

    // Check if user is a manager of this school
    let schoolManager = await SchoolManager.findOne({
      school: schoolId,
      user: token.sub,
      status: 'active'
    });

    if (!schoolManager) {
      // If no SchoolManager record exists, check if user is the original school manager
      const user = await User.findById(token.sub);
      if (!user || user.role !== 'school_manager') {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette école' });
      }
      
      // Check if this user is associated with this school
      const schoolIdFromUser = user.schoolManagerInfo?.organisme;
      if (schoolIdFromUser?.toString() !== schoolId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette école' });
      }
      
      // For backward compatibility, treat as owner
      schoolManager = { role: 'owner' };
    }

    // Check if user can edit school settings
    if (!['owner', 'admin'].includes(schoolManager.role)) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier les paramètres de l\'école' });
    }

    // Find the school
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    // Delete old logo from Cloudinary if it exists
    if (school.logo && school.logo.startsWith('school-logo/')) {
      try {
        await cloudinary.uploader.destroy(school.logo);
      } catch (error) {
        console.error('Error deleting old logo from Cloudinary:', error);
        // Continue even if old logo deletion fails
      }
    }

    // Update school with new logo URL (store public_id for deletion later)
    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { logo: cloudinaryPublicId },
      { new: true, runValidators: true }
    );

    console.log('Updated school with logo - BEFORE update in DB:', {
      id: updatedSchool._id,
      logoFieldInDB: updatedSchool.logo,
      publicIdToStore: cloudinaryPublicId
    });
    
    // Verify it was saved
    const verifySchool = await School.findById(schoolId);
    console.log('Updated school with logo - AFTER verify from DB:', {
      id: verifySchool._id,
      logoFieldInDB: verifySchool.logo,
      logoUrl: cloudinaryUrl
    });

    const responseData = {
      message: 'Logo uploadé avec succès',
      logo: updatedSchool.logo,
      logoUrl: cloudinaryUrl,
      school: {
        id: updatedSchool._id,
        logo: updatedSchool.logo,
        logoUrl: cloudinaryUrl
      }
    };
    
    console.log('Sending response to client:', JSON.stringify(responseData, null, 2));
    
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error uploading logo:', error);
    
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ message: 'Seuls les fichiers image sont autorisés' });
    }
    
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}

