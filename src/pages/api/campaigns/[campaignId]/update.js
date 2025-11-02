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

    // Find the campaign - populate school if needed
    const campaign = await Campaign.findById(campaignId).populate('school');
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if user is school manager
    const User = (await import('../../../../models/User')).default;
    const user = await User.findById(token.sub);
    if (!user || user.role !== 'school_manager') {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Verify user belongs to this school
    // Handle both populated and unpopulated school field
    const schoolId = campaign.school?._id?.toString() || campaign.school?.toString() || campaign.school;
    const userSchoolId = user.schoolManagerInfo?.organisme?.toString();
    
    if (schoolId !== userSchoolId) {
      console.log('School ID mismatch:', { 
        campaignSchoolId: schoolId, 
        userSchoolId: userSchoolId,
        campaignSchool: campaign.school 
      });
      return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
    }

    // Check if campaign is approved - if so, prevent modifications
    console.log('Campaign status check:', {
      campaignId: campaign._id,
      status: campaign.status,
      isApproved: campaign.status === 'approved'
    });
    
    if (campaign.status === 'approved') {
      return res.status(400).json({ 
        message: 'Cette campagne a été approuvée et ne peut plus être modifiée. Veuillez demander à Massibec de la désapprouver.' 
      });
    }

    // Extract update data from request body
    const {
      name,
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
      donationsForSchool
    } = req.body;

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
        
        // Check if delivery date is at least 3 weeks after end date
        const threeWeeksInMillis = 21 * 24 * 60 * 60 * 1000;
        const daysDifference = delivery.getTime() - end.getTime();
        
        console.log('Delivery date validation:', {
          deliveryDate,
          endDate: endDate || campaign.endDate.toISOString().split('T')[0],
          delivery: delivery.toISOString(),
          end: end.toISOString(),
          daysDifference,
          threeWeeksInMillis,
          daysDifferenceInDays: daysDifference / (24 * 60 * 60 * 1000),
          isValid: daysDifference >= threeWeeksInMillis
        });
        
        if (daysDifference < threeWeeksInMillis) {
          return res.status(400).json({ 
            message: `La date de livraison doit être au moins 3 semaines après la fin de la campagne (actuellement ${Math.round(daysDifference / (24 * 60 * 60 * 1000))} jours)` 
          });
        }

        campaign.deliveryDate = delivery;
      }
    }

    // Update campaign fields
    if (name !== undefined) campaign.name = name.trim() || null;
    if (distributionStartHour !== undefined) campaign.distributionStartHour = distributionStartHour;
    if (distributionEndHour !== undefined) campaign.distributionEndHour = distributionEndHour;
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
      distributionEndHour: campaign.distributionEndHour
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
