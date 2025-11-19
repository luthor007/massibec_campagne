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

    // Check if user is school manager or supplier
    const user = await User.findById(token.sub);
    if (!user || (user.role !== 'school_manager' && user.role !== 'fournisseur')) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Find the campaign - try Campaign collection first, then legacy school.campaigns
    let campaign = await Campaign.findById(campaignId).populate('school', 'name');
    let school = null;
    let campaignData = null;
    let isLegacy = false;

    if (campaign) {
      // Campaign found in separate collection
      school = await School.findById(campaign.school._id || campaign.school);
      campaignData = campaign;
    } else {
      // Try to find in legacy school.campaigns array
      const schools = await School.find({
        'campaigns._id': campaignId
      }).lean();

      if (schools.length > 0) {
        school = schools[0];
        campaignData = school.campaigns.find(c => c._id?.toString() === campaignId);
        isLegacy = true;
      }
    }

    if (!campaignData || !school) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // For school managers, verify they belong to this school
    if (user.role === 'school_manager') {
      if (user.schoolManagerInfo?.organisme?.toString() !== school._id.toString()) {
        return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
      }
    }
    // For suppliers, allow access to all campaigns (no verification needed)

    // Get campaign data with fallback (only if not legacy)
    let fallbackSplit = null;
    if (!isLegacy) {
      const campaignDataResult = await getCampaignDataWithFallback(
        school._id,
        school,
        campaignId
      );
      campaignData = campaignDataResult.campaign;
      fallbackSplit = campaignDataResult.fallbackSplit;
    }

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
        _id: campaignData._id,
        campaignNumber: campaignData.campaignNumber,
        status: campaignData.status || 'active',
        financialGoal: campaignData.financialGoal || campaignData.objectifFinancier,
        name: campaignData.name || campaignData.nomCampagne,
        campaignCode: campaignData.campaignCode || (school.code ? `${school.code}-C${campaignData.campaignNumber}` : null)
      }
    });

  } catch (error) {
    console.error('Error fetching campaign participants:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des participants', error: error.message });
  }
}
