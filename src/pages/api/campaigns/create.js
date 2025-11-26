import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import User from '../../../models/User';
import SchoolManager from '../../../models/SchoolManager';
import FunnelEvent from '../../../models/FunnelEvent';
import { getToken } from 'next-auth/jwt';
import { generateCampaignCode } from '../../../utils/campaignHelpers';
import { parseLocalDate } from '../../../utils/dateHelpers';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Helper function to track funnel events server-side
async function trackFunnelEventServer(eventType, userType, userId, metadata = {}) {
  try {
    const sessionId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    // Calculate time since previous event
    let timeSincePreviousEvent = null;
    try {
      const previousEvent = await FunnelEvent.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();
      if (previousEvent) {
        timeSincePreviousEvent = Date.now() - new Date(previousEvent.createdAt).getTime();
      }
    } catch (error) {
      console.error('Error calculating time since previous event:', error);
    }

    const enrichedMetadata = {
      ...metadata,
      timeSincePreviousEvent: timeSincePreviousEvent !== null ? timeSincePreviousEvent : undefined
    };

    const funnelEvent = new FunnelEvent({
      eventType,
      userType,
      userId: userId || null,
      sessionId,
      metadata: enrichedMetadata
    });
    await funnelEvent.save();
  } catch (error) {
    console.error('Error tracking funnel event server-side:', error);
  }
}

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

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Allow school_manager or supplier (suppliers can create campaigns for their auto-created school)
      if (user.role !== 'school_manager' && user.role !== 'supplier') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify user has access to a school via SchoolManager
      const hasSchoolAccess = await SchoolManager.findOne({
        user: userId,
        status: 'active'
      }).lean();

      // Also check legacy schoolManagerInfo for backward compatibility
      const hasLegacyAccess = user.schoolManagerInfo?.organisme;

      if (!hasSchoolAccess && !hasLegacyAccess) {
        return res.status(403).json({ message: 'Vous devez être associé à une école pour créer une campagne' });
      }

      const {
        supplierId,
        startDate,
        endDate,
        deliveryDate,
        distributionStartHour,
        distributionEndHour,
        truckArrivalHour,
        financialGoal,
        customPrices,
        profitSplits,
        donationPresets,
        donationSplit,
        donationsForStudents,
        donationsForSchool,
        groups,
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

      // Validate supplier
      if (!supplierId) {
        return res.status(400).json({ message: 'Le fournisseur est requis' });
      }

      const Supplier = (await import('../../../models/Supplier')).default;
      const supplier = await Supplier.findById(supplierId).lean();
      if (!supplier) {
        return res.status(404).json({ message: 'Fournisseur non trouvé' });
      }
      if (supplier.status !== 'active' || !supplier.approved) {
        return res.status(400).json({ message: 'Le fournisseur sélectionné n\'est pas actif ou approuvé' });
      }

      // Get minimum delivery days from supplier settings (default to 21 days if not set)
      // Check both deliverySettings.minimumDeliveryDays and direct minimumDeliveryDays field
      const minimumDeliveryDays = supplier.deliverySettings?.minimumDeliveryDays
        || supplier.minimumDeliveryDays
        || 21;

      console.log('[Campaign Create API] Supplier delivery settings:', {
        supplierId: supplier._id.toString(),
        deliverySettings: supplier.deliverySettings,
        deliverySettingsType: typeof supplier.deliverySettings,
        deliverySettingsKeys: supplier.deliverySettings ? Object.keys(supplier.deliverySettings) : null,
        minimumDeliveryDays: minimumDeliveryDays,
        hasDeliverySettings: !!supplier.deliverySettings,
        supplierKeys: Object.keys(supplier)
      });
      const minimumDeliveryDaysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
      const timeDiff = delivery.getTime() - end.getTime();

      if (timeDiff < minimumDeliveryDaysInMillis) {
        const daysDiff = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
        return res.status(400).json({
          message: `La date de livraison doit être au moins ${minimumDeliveryDays} jour${minimumDeliveryDays > 1 ? 's' : ''} après la fin de la campagne (selon les paramètres du fournisseur). Actuellement: ${daysDiff} jour${daysDiff > 1 ? 's' : ''}.`
        });
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

      // Validate that products belong to the selected supplier
      if (customPrices && Array.isArray(customPrices) && customPrices.length > 0) {
        const Product = (await import('../../../models/Product')).default;
        const productIds = customPrices.map(cp => cp.productId).filter(Boolean);
        const products = await Product.find({ _id: { $in: productIds } }).lean();
        const invalidProducts = products.filter(p => p.supplier?.toString() !== supplierId.toString());
        if (invalidProducts.length > 0) {
          return res.status(400).json({
            message: 'Certains produits sélectionnés n\'appartiennent pas au fournisseur choisi'
          });
        }
      }

      // Generate automatic campaign name: "Nom Organisation - Mois Année"
      const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const startMonth = startDateObj.getMonth();
      const startYear = startDateObj.getFullYear();
      const campaignName = `${school.name} - ${months[startMonth]} ${startYear}`;

      // Convert productId strings to ObjectIds for customPrices (same as in update API)
      let processedCustomPrices = [];
      if (customPrices && Array.isArray(customPrices) && customPrices.length > 0) {
        processedCustomPrices = customPrices.map(cp => {
          const price = Number(cp.price);
          const productIdObj = mongoose.Types.ObjectId.isValid(cp.productId)
            ? new mongoose.Types.ObjectId(cp.productId)
            : cp.productId;

          return {
            productId: productIdObj,
            price: price
          };
        });
      }

      // Convert productId strings to ObjectIds for profitSplits (same as in update API)
      let processedProfitSplits = [];
      if (profitSplits && Array.isArray(profitSplits) && profitSplits.length > 0) {
        console.log('[campaigns/create API] Received profitSplits:', JSON.stringify(profitSplits.slice(0, 3), null, 2));

        processedProfitSplits = profitSplits.map(ps => {
          const productIdObj = mongoose.Types.ObjectId.isValid(ps.productId)
            ? new mongoose.Types.ObjectId(ps.productId)
            : ps.productId;

          // Preserve actual values, including 0 - don't use defaults
          const result = {
            productId: productIdObj,
            studentCash: ps.studentCash !== undefined && ps.studentCash !== null ? Number(ps.studentCash) : 0,
            studentSchoolAccount: ps.studentSchoolAccount !== undefined && ps.studentSchoolAccount !== null ? Number(ps.studentSchoolAccount) : 0,
            schoolProject: ps.schoolProject !== undefined && ps.schoolProject !== null ? Number(ps.schoolProject) : 0,
            raffle: ps.raffle !== undefined && ps.raffle !== null ? Number(ps.raffle) : 0
          };

          return result;
        });

        console.log('[campaigns/create API] Processed profitSplits:', JSON.stringify(processedProfitSplits.slice(0, 3).map(ps => ({
          productId: ps.productId.toString(),
          studentCash: ps.studentCash,
          studentSchoolAccount: ps.studentSchoolAccount,
          schoolProject: ps.schoolProject,
          raffle: ps.raffle
        })), null, 2));
      } else {
        console.log('[campaigns/create API] No profitSplits received or empty array');
      }

      // Process groups configuration
      let processedGroups = { enabled: false, list: [] };
      if (groups && groups.enabled) {
        // Ensure "Autre" group is always included
        const groupNames = groups.list || [];
        const uniqueGroupNames = [...new Set(groupNames.map(g => g.name || g).filter(Boolean))];

        // Add "Autre" if not already present
        if (!uniqueGroupNames.includes('Autre')) {
          uniqueGroupNames.push('Autre');
        }

        processedGroups = {
          enabled: true,
          list: uniqueGroupNames.map((name, index) => ({
            name: typeof name === 'string' ? name.trim() : (name.name || '').trim(),
            order: index
          })).filter(g => g.name.length > 0)
        };
      }

      const newCampaign = new Campaign({
        name: campaignName,
        campaignNumber: newCampaignNumber,
        school: school._id,
        supplier: supplier._id,
        campaignCode: campaignCode,
        startDate: startDateObj, // Use original date objects, not normalized ones
        endDate: endDateObj,
        deliveryDate: deliveryDateObj,
        distributionStartHour: distributionStartHour || '',
        distributionEndHour: distributionEndHour || '',
        truckArrivalHour: truckArrivalHour || '',
        isActive: true, // Auto-activated
        notes: `Campagne créée le ${new Date().toLocaleDateString('fr-CA')}`,
        profitSplitType: 'absolute', // Always absolute values now
        customPrices: processedCustomPrices,
        profitSplits: processedProfitSplits,
        donationsForStudents: donationsForStudents || {
          enabled: true,
          presets: [0, 2, 5],
          splitConfig: {
            studentAccount: 0.0,
            studentCash: 100.0
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
        status: 'approved', // Auto-approved, no supplier approval needed
        mode: 'test', // Start in test mode (can modify parameters)
        isActive: true, // Activate immediately
        groups: processedGroups
      });

      await newCampaign.save();

      // Update school with new campaign info
      school.currentCampaignNumber = newCampaignNumber;
      school.activeCampaignId = newCampaign._id;

      await school.save();

      // Track school campaign creation
      await trackFunnelEventServer('school_campaign_created', 'school', userId.toString(), {
        campaignId: newCampaign._id.toString(),
        campaignCode: campaignCode,
        schoolId: school._id.toString(),
        financialGoal: parseFloat(financialGoal)
      });

      res.status(201).json({
        message: 'Campagne créée avec succès et activée en mode test.',
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
