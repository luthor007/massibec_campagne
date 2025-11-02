import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import User from '../../../../models/User';
import Order from '../../../../models/Order';
import Campaign from '../../../../models/Campaign';
import { getToken } from 'next-auth/jwt';
import { getCampaignDataWithFallback, calculateOrderProfitsDetailed } from '../../../../utils/campaignHelpers';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await dbConnect();

    // Extract the token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ message: 'ID de campagne requis' });
    }

    // Find the campaign with populated school
    const campaign = await Campaign.findById(campaignId).populate('school', 'name');
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if user is school manager
    const user = await User.findById(token.sub);
    if (!user || user.role !== 'school_manager') {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Get school
    const school = await School.findById(campaign.school._id || campaign.school);
    
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    // Verify user belongs to this school
    if (user.schoolManagerInfo?.organisme?.toString() !== school._id.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
    }

    // Get campaign data with fallback
    const { campaign: campaignData, fallbackSplit } = await getCampaignDataWithFallback(
      school._id, 
      school, 
      campaignId
    );

    // Get all users enrolled in this campaign (students AND school_managers who joined)
    const participants = await User.find({
      'campaigns.campaignId': campaignId
      // Remove role filter to include school_managers who joined their own campaign
    }).lean();

    // Get all orders for this campaign
    const orders = await Order.find({
      campaignId: campaignId
    }).lean();


    // Calculate participant statistics
    const participantsWithStats = participants.map(participant => {
      const participantOrders = orders.filter(order => 
        order.user.toString() === participant._id.toString()
      );

      const totalSales = participantOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalUnits = participantOrders.reduce((sum, order) => {
        return sum + order.products.reduce((orderSum, product) => orderSum + product.quantity, 0);
      }, 0);

      // Calculate profits
      let totalStudentCashBenefit = 0;
      let totalStudentSchoolAccountBenefit = 0;
      let totalSchoolBenefit = 0;
      let totalRaffleBenefit = 0;
      let totalTips = 0;
      
      // Separate donation breakdown
      let totalStudentDonationBenefit = 0;
      let totalSchoolDonationBenefit = 0;

      participantOrders.forEach(order => {
        const profits = calculateOrderProfitsDetailed(order, campaignData, fallbackSplit);
        totalStudentCashBenefit += profits.totalStudentCashBenefit;
        totalStudentSchoolAccountBenefit += profits.totalStudentSchoolAccountBenefit;
        totalSchoolBenefit += profits.totalOrganizationBenefit;
        totalRaffleBenefit += profits.totalRaffleBenefit;
        totalTips += order.tip || 0;
        
        // Add donation breakdown if available
        if (order.tipBreakdown) {
          totalStudentDonationBenefit += (order.tipBreakdown.studentCash || 0) + (order.tipBreakdown.studentSchoolAccount || 0);
          totalSchoolDonationBenefit += order.tipBreakdown.schoolProject || 0;
        }
      });

      const goal = participant.objectifPersonnel || 1000;
      const progress = goal > 0 ? Math.round((totalSales / goal) * 100) : 0;

      // Handle both students and school_managers
      // For students, use parentInfo; for school_managers, use their own name/info
      const isStudent = participant.role === 'student';
      const parentName = isStudent 
        ? (participant.parentInfo ? 
            `${participant.parentInfo.prenomParent} ${participant.parentInfo.nomParent}` : 
            'N/A')
        : participant.name; // For school_managers, use their own name
      const parentPhone = isStudent
        ? (participant.parentInfo?.telephone || 'N/A')
        : (participant.schoolManagerInfo?.telephone || 
           participant.schoolManagerInfo?.cellulaire || 
           'N/A');

      return {
        _id: participant._id,
        name: participant.name,
        email: participant.email,
        role: participant.role, // Include role to distinguish in UI if needed
        parentName: parentName,
        parentPhone: parentPhone,
        totalSales,
        totalUnits,
        goal,
        progress,
        orderCount: participantOrders.length,
        lastOrderDate: participantOrders.length > 0 
          ? Math.max(...participantOrders.map(o => new Date(o.createdAt).getTime()))
          : null,
        // Profit breakdown
        studentCashBenefit: totalStudentCashBenefit,
        studentSchoolAccountBenefit: totalStudentSchoolAccountBenefit,
        studentBenefit: totalStudentCashBenefit + totalStudentSchoolAccountBenefit + totalTips,
        schoolBenefit: totalSchoolBenefit,
        raffleBenefit: totalRaffleBenefit,
        tips: totalTips,
        // New breakdown structure
        studentProfit: totalStudentCashBenefit + totalStudentSchoolAccountBenefit,
        studentDonation: totalStudentDonationBenefit,
        studentTotal: totalStudentCashBenefit + totalStudentSchoolAccountBenefit + totalStudentDonationBenefit,
        schoolProfit: totalSchoolBenefit,
        schoolDonation: totalSchoolDonationBenefit,
        schoolTotal: totalSchoolBenefit + totalSchoolDonationBenefit
      };
    });

    // Sort by total sales (descending)
    participantsWithStats.sort((a, b) => b.totalSales - a.totalSales);

    res.status(200).json({
      participants: participantsWithStats,
      campaign: {
        _id: campaign._id,
        campaignNumber: campaign.campaignNumber,
        status: campaign.status,
        financialGoal: campaign.financialGoal,
        name: campaign.name,
        campaignCode: campaign.campaignCode
      }
    });

  } catch (error) {
    console.error('Error fetching campaign participants:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des participants', error: error.message });
  }
}
