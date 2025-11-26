import dbConnect from '@/lib/mongodb';
import School from '@/models/School';
import SchoolManager from '@/models/SchoolManager';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  await dbConnect();
  const { schoolId } = req.query;

  // Handle GET request - fetch school data
  if (req.method === 'GET') {
    try {
      if (!schoolId) {
        return res.status(400).json({ message: 'School ID requis' });
      }

      const school = await School.findById(schoolId).lean();

      if (!school) {
        return res.status(404).json({ message: 'École non trouvée' });
      }

      return res.status(200).json({
        _id: school._id,
        name: school.name,
        address: school.address,
        ville: school.ville,
        codePostal: school.codePostal,
        telephone: school.telephone,
        email: school.email,
        preferredPaymentMethod: school.preferredPaymentMethod,
        paymentInfo: school.paymentInfo || {},
        deliveryInstructions: school.deliveryInstructions,
        distributionLocation: school.distributionLocation,
        organizationType: school.organizationType || 'school', // Default to school for backward compatibility
        numberOfStudents: school.numberOfStudents || null,
        logo: school.logo,
        logoUrl: school.logo && school.logo.startsWith('school-logo/')
          ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${school.logo}.png`
          : school.logo && school.logo.startsWith('http')
            ? school.logo
            : null,
        dateDeLivraison: school.finCampagne || school.debutCampagne,
        objectifFinancier: school.objectifFinancier,
        totalRaised: school.totalRaised || 0
      });
    } catch (error) {
      console.error('Error fetching school:', error);
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }

  // Handle PATCH request - update school data
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    const updateData = req.body;

    console.log('Update request for school:', schoolId);
    console.log('Update data received:', updateData);
    console.log('Preferred payment method:', updateData.preferredPaymentMethod);
    console.log('Update object being sent to MongoDB:', {
      name: updateData.name.trim(),
      address: updateData.address.trim(),
      ville: updateData.ville.trim(),
      codePostal: updateData.codePostal.trim(),
      telephone: updateData.telephone?.trim() || '',
      email: updateData.email?.trim() || '',
      preferredPaymentMethod: updateData.preferredPaymentMethod || null,
      deliveryInstructions: updateData.deliveryInstructions?.trim() || ''
    });

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

    // Validate required fields
    const requiredFields = ['name', 'address', 'ville', 'codePostal'];
    for (const field of requiredFields) {
      if (!updateData[field] || updateData[field].trim() === '') {
        return res.status(400).json({ message: `Le champ ${field} est requis` });
      }
    }

    // Validate string lengths
    if (updateData.name && updateData.name.trim().length > 200) {
      return res.status(400).json({ message: 'Le nom de l\'école ne peut pas dépasser 200 caractères' });
    }
    if (updateData.address && updateData.address.trim().length > 200) {
      return res.status(400).json({ message: 'L\'adresse ne peut pas dépasser 200 caractères' });
    }
    if (updateData.ville && updateData.ville.trim().length > 100) {
      return res.status(400).json({ message: 'La ville ne peut pas dépasser 100 caractères' });
    }
    if (updateData.codePostal && updateData.codePostal.trim().length > 20) {
      return res.status(400).json({ message: 'Le code postal ne peut pas dépasser 20 caractères' });
    }
    if (updateData.deliveryInstructions && updateData.deliveryInstructions.trim().length > 1000) {
      return res.status(400).json({ message: 'Les instructions de livraison ne peuvent pas dépasser 1000 caractères' });
    }
    if (updateData.distributionLocation && updateData.distributionLocation.trim().length > 500) {
      return res.status(400).json({ message: 'L\'endroit de distribution ne peut pas dépasser 500 caractères' });
    }

    // Update school
    const updateObject = {
      name: updateData.name.trim(),
      address: updateData.address.trim(),
      ville: updateData.ville.trim(),
      codePostal: updateData.codePostal.trim(),
      telephone: updateData.telephone?.trim() || '',
      email: updateData.email?.trim() || '',
      deliveryInstructions: updateData.deliveryInstructions?.trim() || '',
      distributionLocation: updateData.distributionLocation?.trim() || ''
    };

    // Only update preferredPaymentMethod if it's provided
    if (updateData.preferredPaymentMethod !== undefined && updateData.preferredPaymentMethod !== null && updateData.preferredPaymentMethod !== '') {
      updateObject.preferredPaymentMethod = updateData.preferredPaymentMethod;
    } else {
      updateObject.preferredPaymentMethod = null;
    }

    console.log('Final update object:', updateObject);
    console.log('Telephone being saved:', updateObject.telephone);
    console.log('Email being saved:', updateObject.email);

    // Use $set to update only specified fields, keeping other fields like logo intact
    const finalUpdateObject = {
      $set: updateObject
    };

    // Save with error handling for encoding issues
    let updatedSchool;
    try {
      updatedSchool = await School.findByIdAndUpdate(
        schoolId,
        finalUpdateObject,
        { new: true, runValidators: true, upsert: false }
      );

      console.log('School after update - logo field:', updatedSchool.logo);
    } catch (saveError) {
      console.error('Error updating school:', saveError);

      if (saveError.message && saveError.message.includes('Invalid UTF-8')) {
        return res.status(400).json({
          message: 'Les données contiennent des caractères invalides. Veuillez utiliser uniquement des caractères de texte standard.'
        });
      }

      return res.status(500).json({
        message: 'Erreur lors de la mise à jour de l\'école. Veuillez vérifier que toutes les données sont valides.'
      });
    }

    if (!updatedSchool) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    console.log('School updated successfully:', updatedSchool);
    console.log('Updated preferred payment method:', updatedSchool.preferredPaymentMethod);
    console.log('Updated telephone:', updatedSchool.telephone);
    console.log('Updated email:', updatedSchool.email);

    res.status(200).json({
      message: 'Paramètres sauvegardés avec succès',
      school: {
        id: updatedSchool._id,
        name: updatedSchool.name,
        address: updatedSchool.address,
        ville: updatedSchool.ville,
        codePostal: updatedSchool.codePostal,
        telephone: updatedSchool.telephone,
        email: updatedSchool.email,
        preferredPaymentMethod: updatedSchool.preferredPaymentMethod,
        paymentInfo: updatedSchool.paymentInfo || {},
        deliveryInstructions: updatedSchool.deliveryInstructions,
        distributionLocation: updatedSchool.distributionLocation,
        logo: updatedSchool.logo,
        logoUrl: updatedSchool.logo && updatedSchool.logo.startsWith('school-logo/')
          ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${updatedSchool.logo}.png`
          : updatedSchool.logo && updatedSchool.logo.startsWith('http')
            ? updatedSchool.logo
            : null
      }
    });

  } catch (error) {
    console.error('Error updating school settings:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}