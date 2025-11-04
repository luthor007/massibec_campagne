// src/pages/api/school-info.js

import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import Campaign from '../../models/Campaign';
import SchoolManager from '../../models/SchoolManager';
import { getToken } from 'next-auth/jwt';  // Import getToken
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      // Extract the token from the request
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas connecté' });
      }

      const userId = token.sub;  // Extract the user ID from the token
      const requestedSchoolId = req.query.schoolId; // Optional schoolId from query

      const user = await User.findById(userId).lean();  // Use .lean() for plain JS object

      if (!user || user.role !== 'school_manager') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      let schoolId = requestedSchoolId;

      // If no schoolId provided in query, get from user's associations
      if (!schoolId) {
        // First check SchoolManager relationship (most reliable for new users)
        const schoolManager = await SchoolManager.findOne({
          user: userId,
          status: 'active'
        }).lean();
        schoolId = schoolManager?.school;
        
        // If no schoolId from SchoolManager, check legacy schoolManagerInfo
        if (!schoolId) {
          schoolId = user.schoolManagerInfo?.organisme;
        }
        
        console.log('Finding school from user associations:', {
          userId,
          schoolIdFromSchoolManager: schoolManager?.school?.toString(),
          schoolIdFromUserInfo: user.schoolManagerInfo?.organisme?.toString(),
          finalSchoolId: schoolId?.toString()
        });
      } else {
        // Convert schoolId to ObjectId if it's a string
        let schoolIdObj = schoolId;
        if (typeof schoolId === 'string' && mongoose.Types.ObjectId.isValid(schoolId)) {
          schoolIdObj = new mongoose.Types.ObjectId(schoolId);
        } else if (typeof schoolId === 'string') {
          // If it's a string but not valid ObjectId, keep as string for comparison
          schoolIdObj = schoolId;
        }

        // Verify user has access to the requested school
        // Try multiple query formats to handle different ID types
        let hasAccess = null;
        
        // Try 1: ObjectId format
        hasAccess = await SchoolManager.findOne({
          school: schoolIdObj,
          user: userId,
          status: 'active'
        }).lean();

        // Try 2: String format
        if (!hasAccess && typeof schoolId === 'string') {
          hasAccess = await SchoolManager.findOne({
            school: schoolId,
            user: userId,
            status: 'active'
          }).lean();
        }

        // Try 3: Convert both to strings and compare
        if (!hasAccess) {
          const schoolManagerRecords = await SchoolManager.find({
            user: userId,
            status: 'active'
          }).lean();
          
          const requestedSchoolIdStr = schoolIdObj?.toString() || schoolId?.toString();
          
          hasAccess = schoolManagerRecords.find(sm => {
            const smSchoolIdStr = sm.school?.toString();
            return smSchoolIdStr === requestedSchoolIdStr;
          });
        }

        // Also check backward compatibility
        const userSchoolId = user.schoolManagerInfo?.organisme;
        let requestedSchoolIdStr = schoolIdObj?.toString() || schoolId?.toString();
        let userSchoolIdStr = userSchoolId?.toString() || String(userSchoolId);
        
        // User has access if:
        // 1. They have an active SchoolManager record, OR
        // 2. It's their legacy school (backward compatibility)
        const hasLegacyAccess = userSchoolIdStr === requestedSchoolIdStr;
        
        console.log('School access check:', {
          requestedSchoolId: requestedSchoolIdStr,
          userSchoolId: userSchoolIdStr,
          hasAccess: !!hasAccess,
          hasLegacyAccess,
          schoolIdObj: schoolIdObj?.toString(),
          userId: userId?.toString(),
          userHasOrganisme: !!user.schoolManagerInfo?.organisme
        });
        
        // If user has legacy access but no SchoolManager record, create one
        if (!hasAccess && hasLegacyAccess) {
          console.log('Creating missing SchoolManager record for legacy user');
          try {
            // Ensure schoolIdObj is a proper ObjectId
            const schoolObjectId = mongoose.Types.ObjectId.isValid(schoolIdObj) 
              ? new mongoose.Types.ObjectId(schoolIdObj)
              : schoolIdObj;
            
            const newSchoolManager = new SchoolManager({
              school: schoolObjectId,
              user: userId,
              role: 'owner',
              invitedBy: userId,
              status: 'active',
              joinedAt: new Date()
            });
            await newSchoolManager.save();
            console.log('SchoolManager record created successfully:', {
              schoolId: newSchoolManager.school?.toString(),
              userId: newSchoolManager.user?.toString()
            });
            hasAccess = newSchoolManager.toObject();
          } catch (error) {
            console.error('Error creating SchoolManager record:', error);
            // If it's a duplicate key error, try to find it again
            if (error.code === 11000) {
              console.log('Duplicate key error, trying to find existing record');
              hasAccess = await SchoolManager.findOne({
                school: schoolIdObj,
                user: userId,
                status: 'active'
              }).lean();
              
              if (hasAccess) {
                console.log('Found existing SchoolManager record after duplicate error');
              }
            }
          }
        }
        
        if (!hasAccess && !hasLegacyAccess) {
          console.log('Access denied - no SchoolManager record and no legacy access');
          return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à accéder à cette école' });
        }

        // Use the ObjectId version for consistency
        schoolId = schoolIdObj;
      }

      if (!schoolId) {
        return res.status(404).json({ message: 'School not found for user' });
      }

      // Get user's manager role for this school
      const schoolManager = await SchoolManager.findOne({
        school: schoolId,
        user: userId,
        status: 'active'
      }).lean();

      // Await the findById call
      const school = await School.findById(schoolId);

      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      console.log('School found in DB:', school.name);
      console.log('Preferred payment method in DB:', school.preferredPaymentMethod);
      console.log('Telephone in DB:', school.telephone);
      console.log('Email in DB:', school.email);

      // Si le champ preferredPaymentMethod n'existe pas, l'ajouter
      if (school.preferredPaymentMethod === undefined) {
        console.log('Champ preferredPaymentMethod manquant, ajout en cours...');
        await School.findByIdAndUpdate(schoolId, { 
          $set: { preferredPaymentMethod: null } 
        });
        school.preferredPaymentMethod = null;
        console.log('Champ preferredPaymentMethod ajouté');
      }

      // Get active campaign to retrieve delivery date
      let deliveryDate = null;
      let endDate = null;
      let startDate = null;
      
      if (school.activeCampaignId) {
        const activeCampaign = await Campaign.findById(school.activeCampaignId).lean();
        if (activeCampaign) {
          deliveryDate = activeCampaign.deliveryDate;
          endDate = activeCampaign.endDate;
          startDate = activeCampaign.startDate;
        }
      }

      // Optionally, you can structure the response data as needed
      const schoolInfo = {
        id: school._id,
        name: school.name,
        objectifFinancier: school.objectifFinancier,
        totalRaised: school.totalRaised || 0,  // Ensure totalRaised exists
        code: school.code,
        debutCampagne: startDate || school.debutCampagne,
        finCampagne: endDate || school.finCampagne,
        dateDeLivraison: deliveryDate,
        currentCampaignNumber: school.currentCampaignNumber,
        address: school.address,
        email: school.email,
        telephone: school.telephone,
        profileCompleted: school.profileCompleted || false,
        ville: school.ville,
        codePostal: school.codePostal,
        logo: school.logo,
        logoUrl: school.logo && school.logo.startsWith('school-logo/') 
          ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${school.logo}.png`
          : school.logo && school.logo.startsWith('http') 
            ? school.logo 
            : null,
        deliveryInstructions: school.deliveryInstructions,
        distributionLocation: school.distributionLocation || '',
        preferredPaymentMethod: school.preferredPaymentMethod || null,
        organizationType: school.organizationType || 'school', // Default to school for backward compatibility
        numberOfStudents: school.numberOfStudents || null,
        // Manager role information
        managerRole: schoolManager?.role || 'owner', // Default to owner for backward compatibility
        canInviteManagers: !schoolManager || schoolManager.role === 'owner' || schoolManager.role === 'admin', // If no SchoolManager entry, assume owner (backward compatibility)
        canEditSchoolSettings: !schoolManager || schoolManager.role === 'owner' || schoolManager.role === 'admin', // If no SchoolManager entry, assume owner (backward compatibility)
        // User information
        currentUser: {
          name: user.name,
          email: user.email,
          telephone: user.telephone || user.schoolManagerInfo?.telephone || ''
        }
        // Add other relevant fields
      };

      console.log('School info being returned:', schoolInfo);
      console.log('Preferred payment method in response:', schoolInfo.preferredPaymentMethod);
      console.log('School logo in database:', school.logo);
      console.log('School logoUrl in response:', schoolInfo.logoUrl);

      // Set headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).json(schoolInfo);
    } catch (error) {
      console.error('Error fetching school info:', error);
      res.status(500).json({ message: 'Error fetching school info', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}