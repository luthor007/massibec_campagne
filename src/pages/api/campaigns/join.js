import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import Product from '../../../models/Product';
import Store from '../../../models/Store';
import FunnelEvent from '../../../models/FunnelEvent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isUserInCampaign, logLegacyModeWarning } from '../../../utils/campaignHelpers';
import { generateSlug } from '../../../utils/slugHelpers';
import crypto from 'crypto';

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

    const { campaignCode, objectifPersonnel, groupId } = req.body;

    if (!campaignCode) {
      return res.status(400).json({ message: 'Campaign code is required' });
    }

    // Find campaign by code
    const campaign = await Campaign.findOne({ campaignCode })
      .populate('school', 'name code')
      .populate('customPrices.productId', 'name description price cost image');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if campaign is active/approved or in test mode (pending)
    if (!['approved', 'active', 'pending_approval', 'pending_school_approval'].includes(campaign.status)) {
      return res.status(400).json({
        message: 'Campaign is not available for joining',
        status: campaign.status
      });
    }

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already in this campaign
    if (isUserInCampaign(user, campaign._id)) {
      return res.status(400).json({ message: 'You are already part of this campaign' });
    }

    // Determine groupId - use provided or default to "Autre" if groups enabled
    let finalGroupId = null;
    if (campaign.groups && campaign.groups.enabled) {
      const validGroups = campaign.groups.list.map(g => g.name);
      if (groupId && validGroups.includes(groupId)) {
        finalGroupId = groupId;
      } else {
        // Default to "Autre" if groups enabled but invalid/no groupId provided
        finalGroupId = validGroups.includes('Autre') ? 'Autre' : (validGroups[0] || null);
      }
    }

    // Add campaign to user's campaigns array
    const campaignEntry = {
      campaignId: campaign._id,
      schoolId: campaign.school._id,
      groupId: finalGroupId,
      joinedAt: new Date(),
      objectifPersonnel: objectifPersonnel || 1000, // Default objective
      isActive: true
    };

    // If this is the first campaign, set it as active
    const isFirstCampaign = !user.campaigns || user.campaigns.length === 0;

    user.campaigns = user.campaigns || [];
    user.campaigns.push(campaignEntry);

    if (isFirstCampaign) {
      user.activeCampaignId = campaign._id;
    }

    // Mark onboarding step as complete
    if (!user.onboardingProgress) {
      user.onboardingProgress = {};
    }
    user.onboardingProgress.joinedCampaign = true;

    await user.save();

    // Track campaign join
    const userType = user.role === 'student' ? 'student' : 'school';
    await trackFunnelEventServer('campaign_joined', userType, user._id.toString(), {
      campaignId: campaign._id.toString(),
      campaignCode: campaign.campaignCode,
      schoolId: campaign.school._id.toString(),
      isFirstCampaign
    });

    // Create a store for this user and campaign if it doesn't exist
    let store = await Store.findOne({ user: user._id, campaignId: campaign._id });
    if (!store) {
      // Generate slug from user name
      const baseSlug = generateSlug(user.name);
      let slug = baseSlug;
      let counter = 1;

      // Ensure slug is unique
      while (await Store.findOne({ slug, _id: { $ne: store?._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      store = new Store({
        user: user._id,
        campaignId: campaign._id,
        name: `Campagne de ${user.name}`,
        description: "🎉 Profitez des produits exclusifs de Jappuie.ca de fournisseurs 100% québécois ! Économisez plus en achetant plus : 5 % de rabais dès 6 produits. Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et récupérez facilement vos produits. 🙏 Merci pour votre générosité !",
        autoDeposit: false,
        discountEnabled: true,
        slug: slug
      });

      await store.save();
    }

    // Return campaign details with school info
    res.status(200).json({
      message: 'Successfully joined campaign',
      campaign: {
        _id: campaign._id,
        campaignNumber: campaign.campaignNumber,
        campaignCode: campaign.campaignCode,
        school: {
          _id: campaign.school._id,
          name: campaign.school.name,
          code: campaign.school.code
        },
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        deliveryDate: campaign.deliveryDate,
        financialGoal: campaign.financialGoal,
        status: campaign.status,
        customPrices: campaign.customPrices
      },
      isActiveCampaign: isFirstCampaign
    });

  } catch (error) {
    console.error('Error joining campaign:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
