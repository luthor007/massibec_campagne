import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
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

      // Check if user is Massibec admin (you can add role check here)
      // For now, we'll allow any authenticated user to access this
      // In production, you should check for a specific Massibec admin role

      const allCampaigns = [];

      // 1. Get campaigns from separate Campaign collection (new system)
      const separateCampaigns = await Campaign.find({})
        .populate('school', 'name address email telephone split')
        .sort({ createdAt: -1 })
        .lean();

      separateCampaigns.forEach(campaign => {
        allCampaigns.push({
          _id: campaign._id,
          campaignNumber: campaign.campaignNumber,
          campaignCode: campaign.campaignCode,
          // Map to frontend expected field names
          nomCampagne: `Campagne #${campaign.campaignNumber}`,
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
          school: {
            _id: campaign.school._id,
            nomEcole: campaign.school.name, // Map to expected field name
            name: campaign.school.name,
            address: campaign.school.address,
            email: campaign.school.email,
            telephone: campaign.school.telephone,
            split: campaign.school.split
          },
          source: 'separate' // Mark as from separate collection
        });
      });

      // 2. Get campaigns from embedded school.campaigns array (legacy system)
      const schoolsWithEmbeddedCampaigns = await School.find({
        'campaigns.0': { $exists: true }
      }).lean();

      schoolsWithEmbeddedCampaigns.forEach(school => {
        school.campaigns.forEach(campaign => {
          // Skip if this campaign already exists in separate collection
          const existsInSeparate = allCampaigns.some(c => 
            c.school._id.toString() === school._id.toString() && 
            c.campaignNumber === campaign.campaignNumber
          );
          
          if (!existsInSeparate) {
            allCampaigns.push({
              _id: campaign._id,
              campaignNumber: campaign.campaignNumber,
              campaignCode: `${school.code}-C${campaign.campaignNumber}`,
              // Map to frontend expected field names
              nomCampagne: `Campagne #${campaign.campaignNumber}`,
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
      allCampaigns.sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate));

      res.status(200).json(allCampaigns);

    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
