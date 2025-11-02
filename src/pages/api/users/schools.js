import dbConnect from '@/lib/mongodb';
import SchoolManager from '@/models/SchoolManager';
import School from '@/models/School';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const userId = token.sub;

    // Get all SchoolManager records for this user
    const schoolManagers = await SchoolManager.find({
      user: userId,
      status: 'active'
    })
    .populate('school', 'name logo organizationType')
    .lean();

    // Also check for backward compatibility - if user is original school manager
    const user = await User.findById(userId).lean();
    if (user && user.role === 'school_manager' && user.schoolManagerInfo?.organisme) {
      const legacySchoolId = user.schoolManagerInfo.organisme.toString();
      
      // Check if this school is already in the list
      const alreadyInList = schoolManagers.some(
        sm => sm.school && sm.school._id && sm.school._id.toString() === legacySchoolId
      );

      if (!alreadyInList) {
        // Get the school
        const legacySchool = await School.findById(legacySchoolId).lean();
        if (legacySchool) {
          // Add it as an owner (for backward compatibility)
          schoolManagers.push({
            school: legacySchool,
            role: 'owner',
            _id: null // No SchoolManager record exists yet
          });
        }
      }
    }

    // Helper function to convert Cloudinary public_id to URL
    const getLogoUrl = (logo) => {
      if (!logo) return null;
      // If already a URL (http/https), return as is
      if (logo.startsWith('http')) {
        return logo;
      }
      // If it's a Cloudinary public_id, convert to URL
      if (logo.startsWith('school-logo/')) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
        return `https://res.cloudinary.com/${cloudName}/image/upload/${logo}.png`;
      }
      return null;
    };

    // Format the response - filter out any null schools
    const schoolsWithRoles = schoolManagers
      .filter(sm => sm.school && sm.school._id) // Filter out null schools
      .map(sm => ({
        id: sm.school._id.toString(),
        name: sm.school.name || 'École sans nom',
        logo: getLogoUrl(sm.school.logo),
        logoPublicId: sm.school.logo || null, // Keep original public_id for reference
        organizationType: sm.school.organizationType || 'school', // Include organization type
        role: sm.role || 'owner', // Default to owner if not set
        roleLabel: sm.role === 'owner' ? 'Propriétaire' : 
                   sm.role === 'admin' ? 'Administrateur' : 
                   sm.role === 'member' ? 'Membre' : 'Gestionnaire d\'école'
      }));

    res.status(200).json({ schools: schoolsWithRoles });
  } catch (error) {
    console.error('Error fetching user schools:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}

