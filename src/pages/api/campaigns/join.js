import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import Product from '../../../models/Product';
import Store from '../../../models/Store';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isUserInCampaign, logLegacyModeWarning } from '../../../utils/campaignHelpers';
import { generateSlug } from '../../../utils/slugHelpers';

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

    const { campaignCode, objectifPersonnel } = req.body;

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

    // Add campaign to user's campaigns array
    const campaignEntry = {
      campaignId: campaign._id,
      schoolId: campaign.school._id,
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

    await user.save();

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
        description: "🎉 Profitez des pâtés exclusifs de Massibec (viande et poulet) ainsi que d'un choix de délicieuses tartes pour les fêtes ! Économisez plus en achetant plus : 5 % de rabais dès 6 produits. Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et récupérez facilement vos produits. 🙏 Merci pour votre générosité !",
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
