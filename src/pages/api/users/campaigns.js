import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
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
    const user = await User.findById(session.user.id)
      .populate('campaigns.campaignId')
      .populate('campaigns.schoolId', 'name code');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const context = getUserCampaignContext(user);

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
            code: school.code
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
    const campaignsWithDetails = user.campaigns.map(campaignEntry => {
      const campaign = campaignEntry.campaignId;
      const school = campaignEntry.schoolId;
      
      return {
        _id: campaign._id,
        campaignNumber: campaign.campaignNumber,
        campaignCode: campaign.campaignCode,
        school: {
          _id: school._id,
          name: school.name,
          code: school.code
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
    });

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
