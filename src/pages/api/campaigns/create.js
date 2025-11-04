import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import User from '../../../models/User';
import SchoolManager from '../../../models/SchoolManager';
import { getToken } from 'next-auth/jwt';
import { generateCampaignCode } from '../../../utils/campaignHelpers';
import { parseLocalDate } from '../../../utils/dateHelpers';

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

      // Get user info to find the school
      const user = await User.findById(userId).lean();

      if (!user || user.role !== 'school_manager') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        startDate,
        endDate,
        deliveryDate,
        distributionStartHour,
        distributionEndHour,
        financialGoal,
        customPrices,
        profitSplits,
        donationPresets,
        donationSplit,
        donationsForStudents,
        donationsForSchool,
        schoolId // Optional: if provided, use this school instead of finding from user
      } = req.body;

      // Validate required fields
      if (!startDate || !endDate || !deliveryDate || !financialGoal) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
      }

      // Validate dates
      // Parse dates as local dates (YYYY-MM-DD format) to avoid timezone issues
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      const delivery = parseLocalDate(deliveryDate);

      const startDateObj = start;
      const endDateObj = end;
      const deliveryDateObj = delivery;

      // Normalize times for comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      delivery.setHours(0, 0, 0, 0);

      if (end <= start) {
        return res.status(400).json({ message: 'La date de fin doit être après la date de début' });
      }

      // Check if delivery date is at least 3 weeks after end date
      const threeWeeksInMillis = 21 * 24 * 60 * 60 * 1000;
      if (delivery.getTime() - end.getTime() < threeWeeksInMillis) {
        return res.status(400).json({ message: 'La date de livraison doit être au moins 3 semaines après la fin de la campagne' });
      }


      // Find the school - check SchoolManager relationships first, then fall back to legacy schoolManagerInfo
      let school;
      
      if (schoolId) {
        // If schoolId is provided, verify the user has access to it
        const schoolManagerRecord = await SchoolManager.findOne({
          user: userId,
          school: schoolId,
          status: 'active'
        }).lean();
        
        // Also check legacy schoolManagerInfo
        const hasLegacyAccess = user.schoolManagerInfo?.organisme?.toString() === schoolId.toString();
        
        if (!schoolManagerRecord && !hasLegacyAccess) {
          return res.status(403).json({ message: 'Vous n\'avez pas accès à cette école' });
        }
        
        school = await School.findById(schoolId);
      } else {
        // Find school from user associations
        // First check SchoolManager relationship (most reliable for new users)
        const schoolManager = await SchoolManager.findOne({
          user: userId,
          status: 'active'
        }).lean();
        
        if (schoolManager?.school) {
          school = await School.findById(schoolManager.school);
        }
        
        // If no school from SchoolManager, check legacy schoolManagerInfo
        if (!school && user.schoolManagerInfo?.organisme) {
          school = await School.findById(user.schoolManagerInfo.organisme);
        }
      }
      
      if (!school) {
        return res.status(404).json({ message: 'École non trouvée' });
      }

      // Create new campaign
      const newCampaignNumber = school.currentCampaignNumber + 1;
      const campaignCode = generateCampaignCode(school.code, newCampaignNumber);
      
      // Generate automatic campaign name: "Nom Organisation - Mois Année"
      const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const startMonth = startDateObj.getMonth();
      const startYear = startDateObj.getFullYear();
      const campaignName = `${school.name} - ${months[startMonth]} ${startYear}`;
      
      const newCampaign = new Campaign({
        name: campaignName,
        campaignNumber: newCampaignNumber,
        school: school._id,
        campaignCode: campaignCode,
        startDate: startDateObj, // Use original date objects, not normalized ones
        endDate: endDateObj,
        deliveryDate: deliveryDateObj,
        distributionStartHour: distributionStartHour || '',
        distributionEndHour: distributionEndHour || '',
        isActive: false, // Will be activated after approval
        notes: `Campagne créée le ${new Date().toLocaleDateString('fr-CA')}`,
        profitSplitType: 'absolute', // Always absolute values now
        customPrices: customPrices || [],
        profitSplits: profitSplits || [],
        donationsForStudents: donationsForStudents || {
          enabled: true,
          presets: [0, 2, 5],
          splitConfig: {
            studentAccount: 60.0,
            studentCash: 40.0
          }
        },
        donationsForSchool: donationsForSchool || {
          enabled: true,
          presets: [0, 2, 5]
        },
        // Legacy fields for backward compatibility
        donationPresets: donationPresets || [0, 2, 5],
        donationSplit: donationSplit || {
          studentCash: 50.0,
          studentSchoolAccount: 16.7,
          schoolProject: 33.3
        },
        financialGoal: parseFloat(financialGoal),
        status: 'pending_approval' // Pending Massibec approval
      });

      await newCampaign.save();

      // Update school with new campaign info
      school.currentCampaignNumber = newCampaignNumber;
      school.activeCampaignId = newCampaign._id;

      await school.save();

      res.status(201).json({ 
        message: 'Campagne créée avec succès. En attente d\'approbation de Massibec.',
        campaign: {
          ...newCampaign.toObject(),
          campaignCode: campaignCode
        },
        campaignCode: campaignCode
      });

    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ message: 'Erreur lors de la création de la campagne', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
