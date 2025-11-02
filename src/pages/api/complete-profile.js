import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import { getToken } from 'next-auth/jwt';
import cloudinary from '../../utils/cloudinary';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await dbConnect();

      // Extract the token from the request
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas connecté' });
      }

      const userId = token.sub;
      const {
        organizationType,
        organisme,
        adresse,
        ville,
        codePostal,
        emailEcole,
        telephoneEcole,
        numberOfStudents,
        logoFile, // base64 string
        deliveryInstructions,
        distributionLocation,
        titreOuFonction,
        telephone,
        cellulaire,
        momentPourJoindre
      } = req.body;

      // Validate organizationType
      const validOrgTypes = ['school', 'sport_team', 'community_org', 'other'];
      if (!organizationType || !validOrgTypes.includes(organizationType)) {
        return res.status(400).json({ message: 'Type d\'organisation invalide' });
      }

      // Get user and school
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      const school = await School.findById(user.schoolManagerInfo.organisme);
      if (!school) {
        return res.status(404).json({ message: 'École non trouvée' });
      }

      // Handle logo upload if provided
      let logoPublicId = school.logo; // Keep existing logo if no new one provided
      if (logoFile) {
        try {
          // Upload base64 image to Cloudinary
          const uploadResult = await cloudinary.uploader.upload(logoFile, {
            folder: 'school-logo',
            resource_type: 'image',
            transformation: [
              { width: 500, height: 500, crop: 'limit' }
            ]
          });
          logoPublicId = uploadResult.public_id;
          
          // Delete old logo if it exists
          if (school.logo && school.logo.startsWith('school-logo/')) {
            try {
              await cloudinary.uploader.destroy(school.logo);
            } catch (error) {
              console.error('Error deleting old logo:', error);
              // Continue even if deletion fails
            }
          }
        } catch (logoError) {
          console.error('Error uploading logo:', logoError);
          // Continue with profile completion even if logo upload fails
        }
      }

      // Update school information
      const schoolUpdateData = {
        name: organisme,
        address: adresse,
        ville: ville,
        codePostal: codePostal,
        organizationType: organizationType,
        profileCompleted: true
      };
      
      // Add optional fields if provided
      if (emailEcole) {
        schoolUpdateData.email = emailEcole;
      }
      if (telephoneEcole) {
        schoolUpdateData.telephone = telephoneEcole;
      }
      if (numberOfStudents !== undefined && numberOfStudents !== '') {
        schoolUpdateData.numberOfStudents = parseInt(numberOfStudents, 10);
      }
      if (logoPublicId) {
        schoolUpdateData.logo = logoPublicId;
      }
      if (deliveryInstructions) {
        schoolUpdateData.deliveryInstructions = deliveryInstructions;
      }
      if (distributionLocation) {
        schoolUpdateData.distributionLocation = distributionLocation;
      }
      
      console.log('Updating school with data:', {
        schoolId: school._id,
        name: schoolUpdateData.name,
        organizationType: schoolUpdateData.organizationType,
        profileCompleted: schoolUpdateData.profileCompleted
      });
      
      const updatedSchool = await School.findByIdAndUpdate(
        school._id, 
        schoolUpdateData,
        { new: true } // Return the updated document
      );
      
      console.log('School updated successfully:', {
        schoolId: updatedSchool._id,
        name: updatedSchool.name,
        profileCompleted: updatedSchool.profileCompleted
      });

      // Update user school manager info
      await User.findByIdAndUpdate(userId, {
        'schoolManagerInfo.titreOuFonction': titreOuFonction,
        'schoolManagerInfo.telephone': telephone,
        'schoolManagerInfo.cellulaire': cellulaire,
        'schoolManagerInfo.momentPourJoindre': momentPourJoindre,
        profileCompleted: true,
        profileCompletionPercentage: 100
      });

      console.log('Profile completed successfully for user:', userId, 'and school:', school._id);

      // Set headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).json({ 
        message: 'Profil complété avec succès',
        profileCompleted: true
      });
    } catch (error) {
      console.error('Error completing profile:', error);
      res.status(500).json({ message: 'Erreur lors de la sauvegarde' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
