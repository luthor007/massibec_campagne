import dbConnect from '@/lib/mongodb';
import School from '@/models/School';
import SchoolManager from '@/models/SchoolManager';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';
import cloudinary from '@/utils/cloudinary';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { schoolId } = req.query;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID requis' });
    }

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

    // Delete logo from Cloudinary if it exists
    if (school.logo && school.logo.startsWith('school-logo/')) {
      try {
        await cloudinary.uploader.destroy(school.logo);
        console.log('Logo deleted from Cloudinary:', school.logo);
      } catch (error) {
        console.error('Error deleting logo from Cloudinary:', error);
        // Continue even if Cloudinary deletion fails
      }
    }

    // Update school to remove logo reference
    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { logo: null },
      { new: true }
    );

    if (!updatedSchool) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    res.status(200).json({
      message: 'Logo supprimé avec succès',
      school: {
        id: updatedSchool._id,
        logo: null,
        logoUrl: null
      }
    });

  } catch (error) {
    console.error('Error removing logo:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}

