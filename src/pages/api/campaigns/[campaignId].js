import dbConnect from '../../../lib/mongodb';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await dbConnect();

    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ message: 'ID de campagne requis' });
    }

    // Try to find campaign in Campaign collection first
    let campaign = await Campaign.findById(campaignId).lean();
    
    // If not found in Campaign collection, check school's embedded campaigns
    if (!campaign) {
      // Find school that has this campaign embedded
      const school = await School.findOne({
        'campaigns._id': campaignId
      }).lean();
      
      if (school) {
        const embeddedCampaign = school.campaigns?.find((camp) => 
          camp._id?.toString() === campaignId.toString()
        );
        if (embeddedCampaign) {
          campaign = embeddedCampaign;
        }
      }
    }
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // For public access (no token), only return public campaign data (donations config, etc.)
    // For authenticated users, return full campaign data
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      // Public access - return only public data needed for checkout
      const publicCampaign = {
        _id: campaign._id,
        campaignNumber: campaign.campaignNumber,
        campaignCode: campaign.campaignCode,
        donationsForStudents: campaign.donationsForStudents || {
          enabled: true,
          presets: [0, 5, 10, 20]
        },
        donationsForSchool: campaign.donationsForSchool || {
          enabled: true,
          presets: [0, 5, 10, 20]
        },
        customPrices: campaign.customPrices || [],
        profitSplits: campaign.profitSplits || []
      };
      return res.status(200).json({ campaign: publicCampaign });
    }

    // Authenticated access - return full campaign data
    res.status(200).json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la campagne', error: error.message });
  }
}
