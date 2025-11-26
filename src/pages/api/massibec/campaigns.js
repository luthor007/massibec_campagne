import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import User from '../../../models/User';
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

      // Check if user is supplier/admin (you can add role check here)
      // For now, we'll allow any authenticated user to access this
      // In production, you should check for a specific supplier/admin role

      const allCampaigns = [];

      // 1. Get campaigns from separate Campaign collection (new system)
      let separateCampaigns = [];
      try {
        separateCampaigns = await Campaign.find({})
          .populate('school', 'name address email telephone split')
          .sort({ createdAt: -1 })
          .lean();
      } catch (err) {
        console.error('Error fetching separate campaigns:', err);
        // Continue with empty array
      }

      // Get participant counts for all campaigns
      const campaignIds = separateCampaigns.map(c => c._id);
      let participantCounts = [];
      let participantCountMap = {};

      try {
        if (campaignIds.length > 0) {
          participantCounts = await User.aggregate([
            { $unwind: '$campaigns' },
            { $match: { 'campaigns.campaignId': { $in: campaignIds } } },
            { $group: { _id: '$campaigns.campaignId', count: { $sum: 1 } } }
          ]);
        }

        participantCounts.forEach(pc => {
          participantCountMap[pc._id.toString()] = pc.count;
        });
      } catch (err) {
        console.error('Error counting participants:', err);
        // Continue with empty map
      }

      separateCampaigns.forEach(campaign => {
        const campaignId = campaign._id.toString();
        // Skip campaigns without a school
        if (!campaign.school) {
          console.warn(`Campaign ${campaignId} has no school, skipping`);
          return;
        }

        allCampaigns.push({
          _id: campaign._id,
          campaignNumber: campaign.campaignNumber,
          campaignCode: campaign.campaignCode,
          // Map to frontend expected field names
          nomCampagne: campaign.name || `Campagne #${campaign.campaignNumber}`,
          debutCampagne: campaign.startDate,
          finCampagne: campaign.endDate,
          dateDeLivraison: campaign.deliveryDate,
          objectifFinancier: campaign.financialGoal,
          // Map status to frontend expected values
          status: campaign.status === 'pending_approval' ? 'pending' :
            campaign.status === 'approved' ? 'active' :
              campaign.status,
          isActive: campaign.isActive,
          profitSplitType: campaign.profitSplitType,
          profitSplit: campaign.profitSplit,
          rejectionReason: campaign.rejectionReason,
          approvedBy: campaign.approvedBy,
          approvedAt: campaign.approvedAt,
          notes: campaign.notes,
          totalParticipants: participantCountMap[campaignId] || 0,
          school: {
            _id: campaign.school._id,
            nomEcole: campaign.school.name || 'Unknown', // Map to expected field name
            name: campaign.school.name || 'Unknown',
            address: campaign.school.address,
            email: campaign.school.email,
            telephone: campaign.school.telephone,
            split: campaign.school.split
          },
          source: 'separate' // Mark as from separate collection
        });
      });

      // 2. Get campaigns from embedded school.campaigns array (legacy system)
      let schoolsWithEmbeddedCampaigns = [];
      try {
        schoolsWithEmbeddedCampaigns = await School.find({
          'campaigns.0': { $exists: true }
        }).lean();
      } catch (err) {
        console.error('Error fetching legacy campaigns:', err);
        // Continue with empty array
      }

      // Get participant counts for legacy campaigns
      const legacyCampaignIds = [];
      schoolsWithEmbeddedCampaigns.forEach(school => {
        school.campaigns.forEach(campaign => {
          if (campaign._id) {
            legacyCampaignIds.push(campaign._id);
          }
        });
      });

      let legacyParticipantCounts = [];
      let legacyParticipantCountMap = {};

      try {
        if (legacyCampaignIds.length > 0) {
          legacyParticipantCounts = await User.aggregate([
            { $unwind: '$campaigns' },
            { $match: { 'campaigns.campaignId': { $in: legacyCampaignIds } } },
            { $group: { _id: '$campaigns.campaignId', count: { $sum: 1 } } }
          ]);
        }

        legacyParticipantCounts.forEach(pc => {
          legacyParticipantCountMap[pc._id.toString()] = pc.count;
        });
      } catch (err) {
        console.error('Error counting legacy participants:', err);
        // Continue with empty map
      }

      schoolsWithEmbeddedCampaigns.forEach(school => {
        school.campaigns.forEach(campaign => {
          // Skip if this campaign already exists in separate collection
          const existsInSeparate = allCampaigns.some(c =>
            c.school._id.toString() === school._id.toString() &&
            c.campaignNumber === campaign.campaignNumber
          );

          if (!existsInSeparate) {
            const campaignId = campaign._id?.toString() || campaign._id;
            // Only add if campaign has an _id
            if (!campaign._id) {
              console.warn(`Legacy campaign in school ${school._id} has no _id, skipping`);
              return;
            }

            allCampaigns.push({
              _id: campaign._id,
              campaignNumber: campaign.campaignNumber,
              campaignCode: `${school.code}-C${campaign.campaignNumber}`,
              // Map to frontend expected field names
              nomCampagne: campaign.name || `Campagne #${campaign.campaignNumber}`,
              debutCampagne: campaign.startDate,
              finCampagne: campaign.endDate,
              dateDeLivraison: campaign.deliveryDate,
              objectifFinancier: campaign.financialGoal,
              // Map status to frontend expected values
              status: campaign.status === 'pending_approval' ? 'pending' :
                campaign.status === 'approved' ? 'active' :
                  campaign.status || 'active',
              isActive: campaign.isActive,
              profitSplitType: campaign.profitSplitType,
              profitSplit: campaign.profitSplit,
              rejectionReason: campaign.rejectionReason,
              approvedBy: campaign.approvedBy,
              approvedAt: campaign.approvedAt,
              totalParticipants: legacyParticipantCountMap[campaignId] || 0,
              school: {
                _id: school._id,
                nomEcole: school.name, // Map to expected field name
                name: school.name,
                address: school.address,
                email: school.email,
                telephone: school.telephone,
                split: school.split
              },
              source: 'embedded' // Mark as from embedded array
            });
          }
        });
      });

      // Sort by creation date (newest first)
      allCampaigns.sort((a, b) => new Date(b.createdAt || b.debutCampagne || 0) - new Date(a.createdAt || a.debutCampagne || 0));

      console.log(`[Massibec Campaigns API] Found ${allCampaigns.length} campaigns`);
      res.status(200).json(allCampaigns);

    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
