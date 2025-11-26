import dbConnect from '../../../lib/mongodb';
import Campaign from '../../../models/Campaign';
import Product from '../../../models/Product';
import { isValidCampaignCodeFormat } from '../../../utils/campaignHelpers';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Campaign code is required' });
    }

    // Validate campaign code format
    if (!isValidCampaignCodeFormat(code)) {
      return res.status(400).json({
        message: 'Invalid campaign code format. Expected format: XXXXXX-CX'
      });
    }

    // Find campaign by code
    const campaign = await Campaign.findOne({ campaignCode: code })
      .populate('school', 'name code address ville codePostal logo')
      .populate('customPrices.productId', 'name description price cost image');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Return campaign preview info
    res.status(200).json({
      campaign: {
        _id: campaign._id,
        campaignNumber: campaign.campaignNumber,
        campaignCode: campaign.campaignCode,
        school: {
          _id: campaign.school._id,
          name: campaign.school.name,
          code: campaign.school.code,
          address: campaign.school.address,
          ville: campaign.school.ville,
          codePostal: campaign.school.codePostal,
          logo: campaign.school.logo
        },
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        deliveryDate: campaign.deliveryDate,
        financialGoal: campaign.financialGoal,
        status: campaign.status,
        isActive: campaign.isActive,
        customPrices: campaign.customPrices,
        notes: campaign.notes,
        groups: campaign.groups || { enabled: false, list: [] }
      },
      canJoin: ['approved', 'active', 'pending_approval', 'pending_school_approval'].includes(campaign.status),
      statusMessage: campaign.status === 'pending_approval' ? 'Campaign en attente d\'approbation (mode test)' :
        campaign.status === 'pending_school_approval' ? 'Campaign en attente d\'approbation école (mode test)' :
          campaign.status === 'rejected' ? 'Campaign has been rejected' :
            campaign.status === 'completed' ? 'Campaign has ended' :
              'Campaign is available'
    });

  } catch (error) {
    console.error('Error looking up campaign:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
