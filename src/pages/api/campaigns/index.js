import dbConnect from '../../../lib/mongodb';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import User from '../../../models/User';
import SchoolManager from '../../../models/SchoolManager';
import Product from '../../../models/Product';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      // Extract the token from the request
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas connecté' });
      }

      const userId = token.sub;

      // Get user info to find the schools
      const user = await User.findById(userId).lean();

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Allow school_manager or supplier (suppliers can access campaigns for their auto-created school)
      if (user.role !== 'school_manager' && user.role !== 'supplier') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Get all schools this user manages (including SchoolManager relationships)
      const schoolManagerRecords = await SchoolManager.find({
        user: userId,
        status: 'active'
      }).lean();

      let schoolIds = schoolManagerRecords.map(sm => sm.school);

      // Also check for backward compatibility - if user is original school manager
      if (user.schoolManagerInfo?.organisme) {
        const legacySchoolId = user.schoolManagerInfo.organisme.toString();
        const alreadyInList = schoolIds.some(sid => sid?.toString() === legacySchoolId);
        if (!alreadyInList) {
          schoolIds.push(user.schoolManagerInfo.organisme);
        }
      }

      // If no schools found, return empty array
      if (schoolIds.length === 0) {
        return res.status(200).json({ campaigns: [] });
      }

      // Get all campaigns for all schools this user manages
      let campaigns = await Campaign.find({ school: { $in: schoolIds } })
        .populate('supplier', 'name logo email phone pricingSettings')
        .populate('customPrices.productId', 'name price cost image')
        .populate('profitSplits.productId', 'name')
        .sort({ campaignNumber: -1 }); // Most recent first

      console.log('Fetched campaigns from database:', {
        schoolIds: schoolIds.map(id => id?.toString()),
        campaignsCount: campaigns.length,
        campaignIds: campaigns.map(c => c._id?.toString())
      });

      // If no campaigns in Campaign collection, check schools' campaigns arrays (legacy)
      if (campaigns.length === 0) {
        const schools = await School.find({ _id: { $in: schoolIds } }).lean();
        const legacyCampaigns = [];

        for (const school of schools) {
          if (school.campaigns && school.campaigns.length > 0) {
            legacyCampaigns.push(...school.campaigns.map(campaign => ({
              _id: campaign._id,
              campaignNumber: campaign.campaignNumber,
              startDate: campaign.startDate,
              endDate: campaign.endDate,
              deliveryDate: campaign.deliveryDate,
              isActive: campaign.isActive,
              status: campaign.status || 'active',
              financialGoal: campaign.financialGoal,
              profitSplitType: campaign.profitSplitType || 'absolute',
              customPrices: campaign.customPrices || [],
              profitSplits: campaign.profitSplits || [],
              notes: campaign.notes,
              createdAt: campaign.createdAt,
              updatedAt: campaign.updatedAt,
              school: school._id
            })));
          }
        }

        if (legacyCampaigns.length > 0) {
          campaigns = legacyCampaigns;
        }
      }

      res.status(200).json({ campaigns });

    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des campagnes', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
