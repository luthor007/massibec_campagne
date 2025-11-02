// src/utils/campaignHelpers.js
// Helper functions for handling campaign context and legacy mode

/**
 * Check if a campaign is in test mode (pending approval)
 * @param {Object} campaign - Campaign object
 * @returns {Boolean} True if campaign is in test mode
 */
export const isTestCampaign = (campaign) => {
  if (!campaign) return false;
  const status = campaign.status;
  // Handle both string status and potential undefined/null values
  if (!status || typeof status !== 'string') return false;
  return status === 'pending_approval' || status === 'pending_school_approval';
};

/**
 * Get user's campaign context - handles both new campaign system and legacy school system
 * @param {Object} user - User object from database
 * @returns {Object} Campaign context
 */
export const getUserCampaignContext = (user) => {
  if (!user) {
    return { mode: 'none', message: 'No user provided' };
  }

  // New campaign mode: user has campaigns array
  if (user.campaigns && user.campaigns.length > 0) {
    const activeCampaign = user.campaigns.find(c => c.isActive) || user.campaigns[0];
    // Extract school ID from the populated campaign data
    const schoolId = activeCampaign?.schoolId?._id || activeCampaign?.schoolId;
    return {
      mode: 'campaign',
      activeCampaignId: user.activeCampaignId || activeCampaign?.campaignId,
      campaigns: user.campaigns,
      schoolId: schoolId
    };
  }

  // Legacy mode: user has old school field but no campaigns
  if (user.school) {
    return {
      mode: 'legacy',
      schoolId: user.school,
      objectifPersonnel: user.objectifPersonnel
    };
  }

  // No campaigns or school
  return {
    mode: 'none',
    message: 'User has no campaigns or school association'
  };
};

/**
 * Generate campaign code for a school
 * @param {String} schoolCode - School's 6-digit code
 * @param {Number} campaignNumber - Campaign number
 * @returns {String} Campaign code in format {SCHOOL_CODE}-C{CAMPAIGN_NUMBER}
 */
export const generateCampaignCode = (schoolCode, campaignNumber) => {
  return `${schoolCode}-C${campaignNumber}`;
};

/**
 * Validate campaign code format
 * @param {String} campaignCode - Campaign code to validate
 * @returns {Boolean} True if valid format
 */
export const isValidCampaignCodeFormat = (campaignCode) => {
  const pattern = /^\d{6}-C\d+$/;
  return pattern.test(campaignCode);
};

/**
 * Extract school code from campaign code
 * @param {String} campaignCode - Campaign code
 * @returns {String|null} School code or null if invalid
 */
export const extractSchoolCodeFromCampaignCode = (campaignCode) => {
  if (!isValidCampaignCodeFormat(campaignCode)) {
    return null;
  }
  return campaignCode.split('-')[0];
};

/**
 * Check if user is already in a campaign
 * @param {Object} user - User object
 * @param {String} campaignId - Campaign ID to check
 * @returns {Boolean} True if user is already in campaign
 */
export const isUserInCampaign = (user, campaignId) => {
  if (!user.campaigns || !campaignId) {
    return false;
  }
  return user.campaigns.some(c => c.campaignId.toString() === campaignId.toString());
};

/**
 * Get user's active campaign object
 * @param {Object} user - User object
 * @returns {Object|null} Active campaign object or null
 */
export const getActiveCampaign = (user) => {
  if (!user.campaigns || user.campaigns.length === 0) {
    return null;
  }
  
  // First try to find by activeCampaignId
  if (user.activeCampaignId) {
    const activeCampaign = user.campaigns.find(c => 
      c.campaignId.toString() === user.activeCampaignId.toString()
    );
    if (activeCampaign) {
      return activeCampaign;
    }
  }
  
  // Fallback to first active campaign
  return user.campaigns.find(c => c.isActive) || user.campaigns[0];
};

/**
 * Log deprecation warning for legacy mode usage
 * @param {String} context - Context where legacy mode is used
 */
export const logLegacyModeWarning = (context) => {
  console.warn(`[DEPRECATION] Legacy mode used in ${context}. Consider migrating to campaign system.`);
};

/**
 * Get campaign data with fallback to school data
 * @param {String} schoolId - School ID
 * @param {Object} schoolData - School data object
 * @returns {Object} Object containing campaign and fallbackSplit
 */
export const getCampaignDataWithFallback = async (schoolId, schoolData, campaignId = null) => {
  try {
    // Always use API (client-side only)
    if (typeof window !== 'undefined') {
      // If no campaignId and no schoolId, skip API call
      if (!campaignId && !schoolId) {
        console.warn('getCampaignDataWithFallback: No campaignId or schoolId provided, skipping API call');
        return {
          campaign: null,
          fallbackSplit: schoolData?.split || null
        };
      }
      
      const url = campaignId 
        ? `/api/campaigns/${campaignId}`
        : `/api/campaigns/current?schoolId=${schoolId}`;
      
      const campaignResponse = await fetch(url);
      
      if (campaignResponse.ok) {
        const campaignResult = await campaignResponse.json();
        if (campaignResult.campaign) {
          return {
            campaign: campaignResult.campaign,
            fallbackSplit: null
          };
        }
      }
    } else {
      // Server-side: Query database directly
      try {
        const dbConnect = await import('../lib/mongodb').then(m => m.default);
        await dbConnect();
        
        // Dynamically import Campaign model only on server-side
        const Campaign = (await import('../models/Campaign')).default;
        
        let campaign;
        if (campaignId) {
          campaign = await Campaign.findById(campaignId).lean();
        } else {
          campaign = await Campaign.findOne({ 
            school: schoolId,
            isActive: true 
          }).lean();
        }
        
        if (campaign) {
          return {
            campaign: campaign,
            fallbackSplit: null
          };
        }
      } catch (dbError) {
        console.error('Error querying campaign from database:', dbError);
      }
    }
  } catch (error) {
    console.error('Error fetching campaign data:', error);
  }

  // Fallback to school data
  return {
    campaign: null,
    fallbackSplit: schoolData?.split || {
      studentBenefit: 85.6,
      organizationBenefit: 9.4,
      raffleBenefit: 5.0
    }
  };
};

/**
 * Calculate order profits with separate student cash and school account profits
 * @param {Object} order - Order object
 * @param {Object} campaign - Campaign object (can be null)
 * @param {Object} fallbackSplit - Fallback split object
 * @returns {Object} Calculated profits with separate student profits
 */
export const calculateOrderProfitsDetailed = (order, campaign, fallbackSplit) => {
  let totalStudentCashBenefit = 0;
  let totalStudentSchoolAccountBenefit = 0;
  let totalOrganizationBenefit = 0;
  let totalRaffleBenefit = 0;

  if (!order.products || order.products.length === 0) {
    return { 
      totalStudentCashBenefit, 
      totalStudentSchoolAccountBenefit, 
      totalStudentBenefit: totalStudentCashBenefit + totalStudentSchoolAccountBenefit,
      totalOrganizationBenefit, 
      totalRaffleBenefit 
    };
  }

  order.products.forEach(product => {
    const profit = (product.productPrice - product.productCost) * product.quantity;
    
    if (campaign && campaign.profitSplits && campaign.profitSplitType === 'absolute') {
      // Use campaign-specific profit splits
      // Handle both populated and non-populated productId
      const productId = product.product?._id?.toString() || product.product?.toString();
      const profitSplit = campaign.profitSplits.find(ps => {
        const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
        return psProductId === productId;
      });
      
      if (profitSplit) {
        // Use new fields if available, otherwise fallback to old fields
        const studentCash = Number(profitSplit.studentCash) || Number(profitSplit.student) || 0;
        const studentSchoolAccount = Number(profitSplit.studentSchoolAccount) || 0; // No fallback for this
        const schoolProject = Number(profitSplit.schoolProject) || Number(profitSplit.school) || 0;
        const raffle = Number(profitSplit.raffle) || 0;
        
        totalStudentCashBenefit += studentCash * product.quantity;
        totalStudentSchoolAccountBenefit += studentSchoolAccount * product.quantity;
        totalOrganizationBenefit += schoolProject * product.quantity;
        totalRaffleBenefit += raffle * product.quantity;
      } else {
        // Fallback to percentage calculation
        const studentPercentage = fallbackSplit?.studentBenefit || 85.6;
        const organizationPercentage = fallbackSplit?.organizationBenefit || 9.4;
        const rafflePercentage = fallbackSplit?.raffleBenefit || 5.0;
        
        // Assume all student benefit goes to cash for fallback
        totalStudentCashBenefit += profit * (studentPercentage / 100);
        totalOrganizationBenefit += profit * (organizationPercentage / 100);
        totalRaffleBenefit += profit * (rafflePercentage / 100);
      }
    } else {
      // Use percentage-based calculation
      const studentPercentage = fallbackSplit?.studentBenefit || 85.6;
      const organizationPercentage = fallbackSplit?.organizationBenefit || 9.4;
      const rafflePercentage = fallbackSplit?.raffleBenefit || 5.0;
      
      // Assume all student benefit goes to cash for fallback
      totalStudentCashBenefit += profit * (studentPercentage / 100);
      totalOrganizationBenefit += profit * (organizationPercentage / 100);
      totalRaffleBenefit += profit * (rafflePercentage / 100);
    }
  });

  return { 
    totalStudentCashBenefit, 
    totalStudentSchoolAccountBenefit, 
    totalStudentBenefit: totalStudentCashBenefit + totalStudentSchoolAccountBenefit,
    totalOrganizationBenefit, 
    totalRaffleBenefit 
  };
};

/**
 * Calculate order profits using campaign data or fallback to school split
 * @param {Object} order - Order object
 * @param {Object} campaign - Campaign object (can be null)
 * @param {Object} fallbackSplit - Fallback split object
 * @returns {Object} Calculated profits
 */
export const calculateOrderProfits = (order, campaign, fallbackSplit) => {
  let totalStudentBenefit = 0;
  let totalOrganizationBenefit = 0;
  let totalRaffleBenefit = 0;

  if (!order.products || order.products.length === 0) {
    return { totalStudentBenefit, totalOrganizationBenefit, totalRaffleBenefit };
  }

  order.products.forEach(product => {
    const profit = (product.productPrice - product.productCost) * product.quantity;
    
    if (campaign && campaign.profitSplits && campaign.profitSplitType === 'absolute') {
      // Use campaign-specific profit splits
      // Handle both populated and non-populated productId
      const productId = product.product?._id?.toString() || product.product?.toString();
      const profitSplit = campaign.profitSplits.find(ps => {
        const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
        return psProductId === productId;
      });
      
      if (profitSplit) {
        // Use new fields with fallback to old fields
        const studentCash = Number(profitSplit.studentCash) || Number(profitSplit.student) || 1.00;
        const studentSchoolAccount = Number(profitSplit.studentSchoolAccount) || 1.00;
        const schoolProject = Number(profitSplit.schoolProject) || Number(profitSplit.school) || 0.75;
        const raffle = Number(profitSplit.raffle) || 0.25;
        
        // Total student benefit is cash + school account
        const totalStudentProfitPerUnit = studentCash + studentSchoolAccount;
        totalStudentBenefit += totalStudentProfitPerUnit * product.quantity;
        totalOrganizationBenefit += schoolProject * product.quantity;
        totalRaffleBenefit += raffle * product.quantity;
      } else {
        // Fallback to percentage calculation
        const studentPercentage = fallbackSplit?.studentBenefit || 85.6;
        const organizationPercentage = fallbackSplit?.organizationBenefit || 9.4;
        const rafflePercentage = fallbackSplit?.raffleBenefit || 5.0;
        
        totalStudentBenefit += profit * (studentPercentage / 100);
        totalOrganizationBenefit += profit * (organizationPercentage / 100);
        totalRaffleBenefit += profit * (rafflePercentage / 100);
      }
    } else {
      // Use percentage-based calculation
      const studentPercentage = fallbackSplit?.studentBenefit || 85.6;
      const organizationPercentage = fallbackSplit?.organizationBenefit || 9.4;
      const rafflePercentage = fallbackSplit?.raffleBenefit || 5.0;
      
      totalStudentBenefit += profit * (studentPercentage / 100);
      totalOrganizationBenefit += profit * (organizationPercentage / 100);
      totalRaffleBenefit += profit * (rafflePercentage / 100);
    }
  });

  return { totalStudentBenefit, totalOrganizationBenefit, totalRaffleBenefit };
};

/**
 * Calculate amount student needs to pay (revenue - studentCash profit only)
 * This represents the actual cash amount the student needs to pay out of pocket
 * @param {Array} orders - Array of order objects
 * @param {Object|null} campaign - Active campaign with profitSplits (optional)
 * @param {Object|null} fallbackSplit - { studentBenefit, organizationBenefit, raffleBenefit }
 * @returns {Number} amount student needs to pay
 */
export const calculateStudentPaymentAmount = (orders, campaign, fallbackSplit) => {
  if (!Array.isArray(orders) || orders.length === 0) return 0;

  let totalRevenue = 0;
  let totalStudentCashProfit = 0;

  orders.forEach((order) => {
    // Add total order amount to revenue
    totalRevenue += order.totalAmount || 0;

    if (order?.products && order.products.length > 0) {
      order.products.forEach((product) => {
        const quantity = Number(product.quantity || 0);
        const price = Number(product.productPrice || product.price || 0);
        const cost = Number(product.productCost || product.cost || 0);

        if (campaign && Array.isArray(campaign.profitSplits) && campaign.profitSplitType === 'absolute') {
          const pid = product.product?._id?.toString?.() || product.product?.toString?.() || product.productId?.toString?.();
          const split = campaign.profitSplits.find(ps => {
            const psProductId = ps.productId?._id?.toString?.() || ps.productId?.toString?.();
            return psProductId === pid;
          });
          if (split) {
            // Only count studentCash profit, not studentSchoolAccount
            const studentCash = Number(split.studentCash || 0);
            totalStudentCashProfit += studentCash * quantity;
            return;
          }
        }

        // Fallback to percentage calculation - assume all student benefit is cash
        const profit = (price - cost) * quantity;
        const studentPercentage = (fallbackSplit?.studentBenefit || 85.6) / 100;
        totalStudentCashProfit += profit * studentPercentage;
      });
    }
  });

  // Student payment = Revenue - Student Cash Profit
  return totalRevenue - totalStudentCashProfit;
};

/**
 * Calculate total student earnings across orders.
 * Uses campaign absolute per-product splits when available,
 * otherwise falls back to percentage split from school.
 * Tips are added to the student's earnings.
 * @param {Array} orders - Array of order objects
 * @param {Object|null} campaign - Active campaign with profitSplits (optional)
 * @param {Object|null} fallbackSplit - { studentBenefit, organizationBenefit, raffleBenefit }
 * @returns {Number} total student earnings
 */
export const calculateStudentEarnings = (orders, campaign, fallbackSplit) => {
  if (!Array.isArray(orders) || orders.length === 0) return 0;

  const studentPercent = (fallbackSplit?.studentBenefit ?? 85.6) / 100;

  let total = 0;
  orders.forEach((order) => {
    let orderStudent = 0;

    if (order?.products && order.products.length > 0) {
      order.products.forEach((product) => {
        const quantity = Number(product.quantity || 0);
        const price = Number(product.productPrice || product.price || 0);
        const cost = Number(product.productCost || product.cost || 0);

        if (campaign && Array.isArray(campaign.profitSplits) && campaign.profitSplitType === 'absolute') {
          const pid = product.product?._id?.toString?.() || product.product?.toString?.() || product.productId?.toString?.();
          const split = campaign.profitSplits.find(ps => {
            const psProductId = ps.productId?._id?.toString?.() || ps.productId?.toString?.();
            return psProductId === pid;
          });
          if (split) {
            const studentCash = Number(split.studentCash || 0);
            const studentSchoolAccount = Number(split.studentSchoolAccount || 0);
            const totalStudentProfitPerUnit = studentCash + studentSchoolAccount;
            orderStudent += totalStudentProfitPerUnit * quantity;
            return;
          }
        }

        const profit = (price - cost) * quantity;
        orderStudent += profit * studentPercent;
      });
    }

    const tip = Number(order?.tip || 0);
    total += orderStudent + tip;
  });

  return total;
};

/**
 * Calculate total raffle benefit for multiple orders
 * @param {Array} orders - Array of order objects
 * @param {Object} campaign - Campaign object (can be null)
 * @param {Object} fallbackSplit - Fallback split object
 * @returns {number} Total raffle benefit
 */
export const calculateRaffleBenefit = (orders, campaign, fallbackSplit) => {
  let totalRaffleBenefit = 0;

  if (!orders || orders.length === 0) {
    return totalRaffleBenefit;
  }

  orders.forEach(order => {
    const { totalRaffleBenefit: orderRaffleBenefit } = calculateOrderProfits(order, campaign, fallbackSplit);
    totalRaffleBenefit += orderRaffleBenefit;
  });

  return totalRaffleBenefit;
};

/**
 * Calculate donation profits based on campaign's donation split configuration
 * @param {number} tipAmount - The donation amount
 * @param {Object} campaign - Campaign object with donationSplit configuration
 * @returns {Object} Donation breakdown
 */
export const calculateDonationProfits = (tipAmount, campaign) => {
  if (!tipAmount || tipAmount <= 0) {
    return { studentCash: 0, studentSchoolAccount: 0, schoolProject: 0 };
  }
  
  // Use campaign's donation split or fallback to default percentages
  const split = campaign?.donationSplit || { 
    studentCash: 50.0, 
    studentSchoolAccount: 16.7, 
    schoolProject: 33.3 
  };
  
  // Calculate breakdown using percentages
  return {
    studentCash: Math.round((tipAmount * split.studentCash / 100) * 100) / 100,
    studentSchoolAccount: Math.round((tipAmount * split.studentSchoolAccount / 100) * 100) / 100,
    schoolProject: Math.round((tipAmount * split.schoolProject / 100) * 100) / 100
  };
};