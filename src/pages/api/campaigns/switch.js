import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Campaign from '../../../models/Campaign';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isUserInCampaign, logLegacyModeWarning } from '../../../utils/campaignHelpers';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Get user session
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ message: 'Campaign ID is required' });
    }

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has campaigns
    if (!user.campaigns || user.campaigns.length === 0) {
      return res.status(400).json({ message: 'User has no campaigns' });
    }

    // Check if user is in the requested campaign
    if (!isUserInCampaign(user, campaignId)) {
      return res.status(400).json({ message: 'User is not part of this campaign' });
    }

    // Verify campaign exists and is valid
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Update active campaign
    user.activeCampaignId = campaignId;
    await user.save();

    res.status(200).json({
      message: 'Active campaign updated successfully',
      activeCampaignId: campaignId,
      campaign: {
        _id: campaign._id,
        campaignNumber: campaign.campaignNumber,
        campaignCode: campaign.campaignCode,
        status: campaign.status
      }
    });

  } catch (error) {
    console.error('Error switching campaign:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
