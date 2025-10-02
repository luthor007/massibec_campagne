import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
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

      // Find all schools with campaigns
      const schools = await School.find({
        'campaigns.0': { $exists: true }
      }).lean();

      // Flatten campaigns with school info
      const allCampaigns = [];
      schools.forEach(school => {
        school.campaigns.forEach(campaign => {
          allCampaigns.push({
            _id: campaign._id,
            campaignNumber: campaign.campaignNumber,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            deliveryDate: campaign.deliveryDate,
            status: campaign.status,
            profitSplitType: campaign.profitSplitType,
            profitSplit: campaign.profitSplit,
            financialGoal: campaign.financialGoal,
            rejectionReason: campaign.rejectionReason,
            approvedBy: campaign.approvedBy,
            approvedAt: campaign.approvedAt,
            school: {
              _id: school._id,
              name: school.name,
              address: school.address,
              email: school.email,
              telephone: school.telephone
            }
          });
        });
      });

      // Sort by creation date (newest first)
      allCampaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.status(200).json(allCampaigns);

    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
