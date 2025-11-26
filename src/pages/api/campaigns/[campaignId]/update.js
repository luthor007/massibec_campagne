import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import { parseLocalDate } from '../../../../utils/dateHelpers';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await dbConnect();

    // Extract the token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ message: 'ID de campagne requis' });
    }

    // Find the campaign - populate school and supplier if needed
    const campaign = await Campaign.findById(campaignId)
      .populate('school')
      .populate('supplier', 'name pricingSettings');
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if user is school manager or supplier
    const User = (await import('../../../../models/User')).default;
    const SchoolManager = (await import('../../../../models/SchoolManager')).default;
    const user = await User.findById(token.sub);

    if (!user || (user.role !== 'school_manager' && user.role !== 'supplier')) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Verify user has access to this campaign's school
    // Handle both populated and unpopulated school field
    const schoolId = campaign.school?._id?.toString() || campaign.school?.toString() || campaign.school;

    let hasAccess = false;

    if (user.role === 'school_manager') {
      // For school managers, check SchoolManager relationship or legacy schoolManagerInfo
      const schoolManager = await SchoolManager.findOne({
        user: user._id,
        school: schoolId,
        status: 'active'
      }).lean();

      const hasLegacyAccess = user.schoolManagerInfo?.organisme?.toString() === schoolId?.toString();
      hasAccess = !!schoolManager || hasLegacyAccess;
    } else if (user.role === 'supplier') {
      // For suppliers, check if they own the campaign's supplier or if they have a school
      const SupplierManager = (await import('../../../../models/SupplierManager')).default;

      // Get supplier for this user
      const supplierManager = await SupplierManager.findOne({
        user: user._id,
        status: 'active'
      }).lean();

      if (supplierManager && supplierManager.supplier) {
        const userSupplierId = supplierManager.supplier.toString();
        const campaignSupplierId = campaign.supplier?._id?.toString() || campaign.supplier?.toString() || campaign.supplier;

        // Supplier can edit if:
        // 1. They own the campaign's supplier, OR
        // 2. They have an auto-created school that matches the campaign's school
        if (campaignSupplierId && userSupplierId && campaignSupplierId === userSupplierId) {
          hasAccess = true;
        } else {
          // Check if supplier has a school that matches the campaign's school
          const supplierSchoolManager = await SchoolManager.findOne({
            user: user._id,
            school: schoolId,
            status: 'active'
          }).lean();
          hasAccess = !!supplierSchoolManager;
        }
      }
    }

    if (!hasAccess) {
      let userSupplierId = null;
      if (user.role === 'supplier') {
        const SupplierManager = (await import('../../../../models/SupplierManager')).default;
        const supplierManager = await SupplierManager.findOne({
          user: user._id,
          status: 'active'
        }).lean();
        userSupplierId = supplierManager?.supplier?.toString();
      }

      console.log('Access denied:', {
        userId: user._id,
        userRole: user.role,
        campaignSchoolId: schoolId,
        campaignSupplierId: campaign.supplier?._id?.toString() || campaign.supplier?.toString(),
        userSupplierId: userSupplierId
      });
      return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
    }

    // Check if campaign is in production mode - if so, prevent modifications
    // EXCEPTION: Allow group modifications (add/remove empty groups) even in production
    console.log('Campaign mode check:', {
      campaignId: campaign._id,
      mode: campaign.mode,
      isProduction: campaign.mode === 'production',
      requestedGroups: req.body.groups !== undefined
    });

    // Extract update data from request body
    const {
      name,
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
      groups
    } = req.body;

    // Check if this is ONLY a groups update (allowed in production)
    const isOnlyGroupsUpdate = campaign.mode === 'production' &&
      groups !== undefined &&
      name === undefined &&
      startDate === undefined &&
      endDate === undefined &&
      deliveryDate === undefined &&
      distributionStartHour === undefined &&
      distributionEndHour === undefined &&
      truckArrivalHour === undefined &&
      financialGoal === undefined &&
      customPrices === undefined &&
      profitSplits === undefined &&
      donationPresets === undefined &&
      donationSplit === undefined &&
      donationsForStudents === undefined &&
      donationsForSchool === undefined;

    if (campaign.mode === 'production' && !isOnlyGroupsUpdate) {
      return res.status(400).json({
        message: 'Cette campagne est en mode production et ne peut plus être modifiée. Veuillez la passer en mode test pour la modifier. Note: Vous pouvez toujours ajouter ou supprimer des groupes vides.'
      });
    }

    // Validate dates if provided
    if (startDate || endDate || deliveryDate) {
      // Validate start date if provided
      if (startDate) {
        const start = parseLocalDate(startDate);
        campaign.startDate = start;
      }

      // Validate end date if provided
      if (endDate) {
        const end = parseLocalDate(endDate);
        const start = startDate ? parseLocalDate(startDate) : parseLocalDate(campaign.startDate.toISOString().split('T')[0]);

        if (end <= start) {
          return res.status(400).json({ message: 'La date de fin doit être après la date de début' });
        }

        campaign.endDate = end;
      }

      // Validate delivery date if provided
      if (deliveryDate) {
        const delivery = parseLocalDate(deliveryDate);
        const end = endDate ? parseLocalDate(endDate) : parseLocalDate(campaign.endDate.toISOString().split('T')[0]);

        // Get minimum delivery days from supplier settings (default to 21 days if not set)
        const Supplier = (await import('../../../../models/Supplier')).default;
        const supplierId = campaign.supplier?._id?.toString() || campaign.supplier?.toString() || campaign.supplier;
        let minimumDeliveryDays = 21; // Default

        if (supplierId) {
          try {
            const supplier = await Supplier.findById(supplierId).lean();
            if (supplier) {
              minimumDeliveryDays = supplier.deliverySettings?.minimumDeliveryDays
                || supplier.minimumDeliveryDays
                || 21;
            }
          } catch (error) {
            console.error('Error fetching supplier for delivery validation:', error);
            // Use default 21 days if error
          }
        }

        const minimumDeliveryDaysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
        const daysDifference = delivery.getTime() - end.getTime();
        const daysDifferenceInDays = Math.round(daysDifference / (24 * 60 * 60 * 1000));

        console.log('Delivery date validation:', {
          deliveryDate,
          endDate: endDate || campaign.endDate.toISOString().split('T')[0],
          delivery: delivery.toISOString(),
          end: end.toISOString(),
          daysDifference,
          minimumDeliveryDays,
          minimumDeliveryDaysInMillis,
          daysDifferenceInDays,
          isValid: daysDifference >= minimumDeliveryDaysInMillis
        });

        if (daysDifference < minimumDeliveryDaysInMillis) {
          return res.status(400).json({
            message: `La date de livraison doit être au moins ${minimumDeliveryDays} jour${minimumDeliveryDays > 1 ? 's' : ''} après la fin de la campagne (selon les paramètres du fournisseur). Actuellement: ${daysDifferenceInDays} jour${daysDifferenceInDays > 1 ? 's' : ''}.`
          });
        }

        campaign.deliveryDate = delivery;
      }
    }

    // Update campaign fields
    if (name !== undefined) campaign.name = name.trim() || null;
    if (distributionStartHour !== undefined) campaign.distributionStartHour = distributionStartHour;
    if (distributionEndHour !== undefined) campaign.distributionEndHour = distributionEndHour;
    if (truckArrivalHour !== undefined) campaign.truckArrivalHour = truckArrivalHour;
    if (financialGoal !== undefined) campaign.financialGoal = financialGoal;

    // Convert productId strings to ObjectIds for customPrices
    if (customPrices) {
      console.log('[campaigns/update API] Received customPrices:', JSON.stringify(customPrices, null, 2));
      campaign.customPrices = customPrices.map(cp => {
        const price = Number(cp.price);
        const productIdObj = mongoose.Types.ObjectId.isValid(cp.productId) ? new mongoose.Types.ObjectId(cp.productId) : cp.productId;
        console.log(`[campaigns/update API] Processing customPrice - productId: ${cp.productId} -> ${productIdObj}, price: ${cp.price} -> ${price}`);
        return {
          productId: productIdObj,
          price: price
        };
      });
      console.log('[campaigns/update API] Final customPrices to save:', JSON.stringify(campaign.customPrices.map(cp => ({
        productId: cp.productId.toString(),
        price: cp.price
      })), null, 2));
    }

    // Convert productId strings to ObjectIds for profitSplits
    if (profitSplits) {
      campaign.profitSplits = profitSplits.map(ps => ({
        productId: mongoose.Types.ObjectId.isValid(ps.productId) ? new mongoose.Types.ObjectId(ps.productId) : ps.productId,
        studentCash: ps.studentCash !== undefined ? Number(ps.studentCash) : (ps.student !== undefined ? Number(ps.student) : 1.00),
        studentSchoolAccount: ps.studentSchoolAccount !== undefined ? Number(ps.studentSchoolAccount) : 0,
        schoolProject: ps.schoolProject !== undefined ? Number(ps.schoolProject) : (ps.school !== undefined ? Number(ps.school) : 0.75),
        raffle: ps.raffle !== undefined ? Number(ps.raffle) : 0.25
      }));
    }

    // Update new donation configuration
    if (donationsForStudents) {
      campaign.donationsForStudents = {
        enabled: donationsForStudents.enabled,
        presets: donationsForStudents.presets,
        splitConfig: donationsForStudents.splitConfig
      };
    }
    if (donationsForSchool) {
      campaign.donationsForSchool = {
        enabled: donationsForSchool.enabled,
        presets: donationsForSchool.presets
      };
    }

    // Legacy: Update old donation configuration for backward compatibility
    if (donationPresets) {
      campaign.donationPresets = donationPresets;
    }
    if (donationSplit) {
      campaign.donationSplit = donationSplit;
    }

    // Update groups configuration
    if (groups !== undefined) {
      if (groups.enabled) {
        // Validate groups if enabled
        const groupNames = groups.list || [];
        const uniqueGroupNames = [...new Set(groupNames.map(g => g.name || g).filter(Boolean))];

        // Ensure "Autre" group is always included
        if (!uniqueGroupNames.includes('Autre')) {
          uniqueGroupNames.push('Autre');
        }

        // Check if we're trying to delete groups with students (only in production mode)
        if (campaign.mode === 'production' && campaign.groups && campaign.groups.list) {
          const User = (await import('../../../../models/User')).default;
          const existingGroupNames = campaign.groups.list.map(g => g.name);
          const newGroupNames = uniqueGroupNames;
          const deletedGroups = existingGroupNames.filter(name => !newGroupNames.includes(name) && name !== 'Autre');

          if (deletedGroups.length > 0) {
            // Check if any students are in these groups
            for (const deletedGroupName of deletedGroups) {
              const studentsInGroup = await User.countDocuments({
                'campaigns.campaignId': campaign._id,
                'campaigns.groupId': deletedGroupName
              });

              if (studentsInGroup > 0) {
                return res.status(400).json({
                  message: `Impossible de supprimer le groupe "${deletedGroupName}" car ${studentsInGroup} étudiant${studentsInGroup > 1 ? 's' : ''} ${studentsInGroup > 1 ? 'y sont' : 'y est'} déjà inscrit${studentsInGroup > 1 ? 's' : ''}.`
                });
              }
            }
          }
        }

        campaign.groups = {
          enabled: true,
          list: uniqueGroupNames.map((name, index) => ({
            name: typeof name === 'string' ? name.trim() : (name.name || '').trim(),
            order: index
          })).filter(g => g.name.length > 0)
        };
      } else {
        campaign.groups = { enabled: false, list: [] };
      }
    }

    // Save the campaign
    await campaign.save();

    // Populate productId fields for customPrices and profitSplits before returning
    await campaign.populate([
      { path: 'customPrices.productId', select: 'name price cost image' },
      { path: 'profitSplits.productId', select: 'name' },
      { path: 'school', select: 'name code' }
    ]);

    console.log('Campaign updated successfully:', {
      campaignId: campaign._id,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      deliveryDate: campaign.deliveryDate,
      financialGoal: campaign.financialGoal,
      customPricesCount: campaign.customPrices?.length,
      profitSplitsCount: campaign.profitSplits?.length,
      distributionStartHour: campaign.distributionStartHour,
      distributionEndHour: campaign.distributionEndHour,
      truckArrivalHour: campaign.truckArrivalHour
    });

    res.status(200).json({
      message: 'Campagne mise à jour avec succès',
      campaign: campaign.toObject()
    });

  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la campagne', error: error.message });
  }
}
