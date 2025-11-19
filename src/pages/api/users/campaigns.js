import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getUserCampaignContext, logLegacyModeWarning } from '../../../utils/campaignHelpers';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Get user session
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get user with campaigns populated
    // Use lean() and manual population to handle edge cases better
    let user = await User.findById(session.user.id).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Manually populate campaigns to handle cases where automatic population fails
    if (user.campaigns && user.campaigns.length > 0) {
      const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', new mongoose.Schema({}, { strict: false }));
      const School = mongoose.models.School || mongoose.model('School', new mongoose.Schema({}, { strict: false }));

      for (let i = 0; i < user.campaigns.length; i++) {
        const entry = user.campaigns[i];

        // Populate campaignId if not already populated
        if (entry.campaignId && !entry.campaignId.campaignCode) {
          try {
            const campaign = await Campaign.findById(entry.campaignId).lean();
            if (campaign) {
              entry.campaignId = campaign;
            } else {
              entry.campaignId = null; // Mark as invalid
            }
          } catch (err) {
            console.error(`[users/campaigns] Error populating campaign ${entry.campaignId}:`, err.message);
            entry.campaignId = null; // Mark as invalid
          }
        }

        // Populate schoolId if not already populated
        if (entry.schoolId && !entry.schoolId.name) {
          try {
            const school = await School.findById(entry.schoolId).select('name code logo').lean();
            if (school) {
              entry.schoolId = school;
            } else {
              entry.schoolId = null; // Mark as invalid
            }
          } catch (err) {
            console.error(`[users/campaigns] Error populating school ${entry.schoolId}:`, err.message);
            entry.schoolId = null; // Mark as invalid
          }
        }
      }
    }

    // Debug logging for problematic campaigns
    if (user.campaigns && user.campaigns.length > 0) {
      user.campaigns.forEach((entry, index) => {
        if (!entry.campaignId || !entry.schoolId) {
          console.log(`[users/campaigns] Campaign entry ${index} has missing data:`, {
            hasCampaignId: !!entry.campaignId,
            hasSchoolId: !!entry.schoolId,
            campaignIdValue: entry.campaignId?._id || entry.campaignId,
            schoolIdValue: entry.schoolId?._id || entry.schoolId,
            rawCampaignId: entry.campaignId,
            rawSchoolId: entry.schoolId
          });
        }
      });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const context = getUserCampaignContext(user);

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

    if (context.mode === 'none') {
      return res.status(200).json({
        campaigns: [],
        activeCampaignId: null,
        mode: 'none',
        message: 'No campaigns found. Join a campaign to get started.'
      });
    }

    if (context.mode === 'legacy') {
      // Log deprecation warning
      logLegacyModeWarning('User Campaigns API');

      // For legacy users, return their school info as a "campaign"
      const school = await School.findById(context.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      return res.status(200).json({
        campaigns: [{
          _id: `legacy-${school._id}`,
          campaignNumber: 1,
          campaignCode: `${school.code}-C1`,
          school: {
            _id: school._id,
            name: school.name,
            code: school.code,
            logo: getLogoUrl(school.logo)
          },
          status: 'legacy',
          isActive: true,
          objectifPersonnel: context.objectifPersonnel,
          joinedAt: user.createdAt || new Date(),
          isLegacy: true
        }],
        activeCampaignId: `legacy-${school._id}`,
        mode: 'legacy'
      });
    }

    // Campaign mode - return user's campaigns
    // Filter out campaigns where population failed (null campaignId or schoolId)
    const validCampaigns = user.campaigns.filter(campaignEntry => {
      const isValid = campaignEntry.campaignId && campaignEntry.schoolId;
      if (!isValid) {
        console.warn('[users/campaigns] Filtered out invalid campaign entry:', {
          campaignId: campaignEntry.campaignId?._id || campaignEntry.campaignId,
          schoolId: campaignEntry.schoolId?._id || campaignEntry.schoolId,
          userId: user._id
        });
      }
      return isValid;
    });

    const campaignsWithDetails = validCampaigns.map(campaignEntry => {
      const campaign = campaignEntry.campaignId;
      const school = campaignEntry.schoolId;

      // Additional safety check - skip if campaign or school is null/undefined
      if (!campaign || !school) {
        return null;
      }

      return {
        _id: campaign._id,
        campaignNumber: campaign.campaignNumber,
        campaignCode: campaign.campaignCode,
        school: {
          _id: school._id,
          name: school.name,
          code: school.code,
          logo: getLogoUrl(school.logo)
        },
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        deliveryDate: campaign.deliveryDate,
        financialGoal: campaign.financialGoal,
        status: campaign.status,
        isActive: campaign.isActive,
        objectifPersonnel: campaignEntry.objectifPersonnel,
        joinedAt: campaignEntry.joinedAt,
        isActiveCampaign: user.activeCampaignId &&
          user.activeCampaignId.toString() === campaign._id.toString()
      };
    }).filter(Boolean); // Remove any null entries

    res.status(200).json({
      campaigns: campaignsWithDetails,
      activeCampaignId: context.activeCampaignId,
      mode: 'campaign'
    });

  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
