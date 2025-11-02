import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Order from '../../../../models/Order';
import Campaign from '../../../../models/Campaign';
import { calculateOrderProfitsDetailed } from '../../../../utils/campaignHelpers';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { campaignId } = req.query;

  if (!campaignId) {
    return res.status(400).json({ message: 'Campaign ID is required' });
  }

  try {
    await dbConnect();

    // Fetch campaign details
    const campaign = await Campaign.findById(campaignId).populate('school', 'name split');
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Fetch all users enrolled in this campaign (students AND school_managers who joined)
    const students = await User.find({
      'campaigns.campaignId': campaignId
      // Remove role filter to include school_managers who joined their own campaign
    }).select('name firstName lastName email parentFirstName parentLastName parentEmail parentPhone parentInfo schoolManagerInfo role campaigns');

    if (!students || students.length === 0) {
      return res.status(200).json({
        students: [],
        aggregateStats: {
          totalStudents: 0,
          totalSales: 0,
          totalStudentEarnings: 0,
          totalOrders: 0
        },
        campaign: {
          name: campaign.name,
          code: campaign.campaignCode,
          startDate: campaign.startDate,
          endDate: campaign.endDate
        }
      });
    }

    // Prepare students data with orders and metrics
    const studentsData = await Promise.all(
      students.map(async (student) => {
        // Find the campaign in student's campaigns array
        const studentCampaign = student.campaigns.find(
          c => c.campaignId?.toString() === campaignId || c.campaignId?._id?.toString() === campaignId
        );

        // Fetch all orders for this student in this campaign
        const orders = await Order.find({
          user: student._id,
          campaignId: campaignId
        }).sort({ createdAt: -1 });

        // Calculate metrics
        let totalSales = 0;
        let totalProductCost = 0;
        let totalStudentCashProfit = 0;
        let totalStudentSchoolAccountProfit = 0;
        let totalSchoolProjectEarnings = 0;
        let totalRaffleEarnings = 0;
        let totalDons = 0;
        let totalStudentDonations = 0; // Student's portion of donations (separate from product profits)
        let totalSchoolDonations = 0; // School's portion of donations (separate from product profits)
        const productBreakdown = {};

        // Get fallback split from campaign or school
        const fallbackSplit = campaign.school?.split || {
          studentBenefit: 85.6,
          organizationBenefit: 9.4,
          raffleBenefit: 5.0
        };

        orders.forEach(order => {
          totalSales += order.totalAmount || 0;
          
          // Use new donation fields if available, fallback to legacy tip
          const studentDonationAmount = order.studentDonation || 0;
          const schoolDonationAmount = order.schoolDonation || 0;
          totalDons += studentDonationAmount + schoolDonationAmount + (order.tip || 0); // Include legacy tip for backward compatibility

          // Calculate product costs
          if (order.products && order.products.length > 0) {
            order.products.forEach(product => {
              const productCost = product.productCost || 0;
              const quantity = product.quantity || 0;
              totalProductCost += productCost * quantity;

              // Product breakdown
              const productName = product.productName || 'Produit inconnu';
              if (productBreakdown[productName]) {
                productBreakdown[productName] += quantity;
              } else {
                productBreakdown[productName] = quantity;
              }
            });
          }

          // Calculate detailed PRODUCT profits using campaignHelpers (does NOT include donations)
          const profits = calculateOrderProfitsDetailed(order, campaign, fallbackSplit);
          totalStudentCashProfit += profits.totalStudentCashBenefit;
          totalStudentSchoolAccountProfit += profits.totalStudentSchoolAccountBenefit;
          totalSchoolProjectEarnings += profits.totalOrganizationBenefit;
          totalRaffleEarnings += profits.totalRaffleBenefit;
          
          // Track NEW donation fields
          if (studentDonationAmount > 0) {
            // Track student donations with split breakdown
            if (order.studentDonationSplit) {
              // Use the actual split from the order
              totalStudentDonations += order.studentDonationSplit.studentAccount || 0;
              totalStudentDonations += order.studentDonationSplit.studentCash || 0;
            } else {
              // Fallback: use legacy tipBreakdown if studentDonationSplit not available
              if (order.tipBreakdown) {
                totalStudentDonations += (order.tipBreakdown.studentCash || 0) + (order.tipBreakdown.studentSchoolAccount || 0);
              }
            }
          }
          
          // Track school donations
          if (schoolDonationAmount > 0) {
            totalSchoolDonations += schoolDonationAmount;
          } else if (order.tipBreakdown) {
            // Legacy: Track school's donation portion from tipBreakdown
            totalSchoolDonations += order.tipBreakdown.schoolProject || 0;
          }
          
          // Note: Donations are NOT added to product profits to avoid double counting
        });

        // Format product breakdown as array
        const productBreakdownArray = Object.entries(productBreakdown).map(([name, quantity]) => ({
          name,
          quantity
        }));

        // Handle both students and school_managers
        const isStudent = student.role === 'student';
        const firstName = isStudent 
          ? (student.firstName || student.name?.split(' ')[0] || '')
          : (student.name?.split(' ')[0] || '');
        const lastName = isStudent
          ? (student.lastName || student.name?.split(' ').slice(1).join(' ') || '')
          : (student.name?.split(' ').slice(1).join(' ') || '');
        const parentFirstName = isStudent
          ? (student.parentFirstName || student.parentInfo?.prenomParent || '')
          : firstName; // For school_managers, use their own first name
        const parentLastName = isStudent
          ? (student.parentLastName || student.parentInfo?.nomParent || '')
          : lastName; // For school_managers, use their own last name
        const parentEmail = isStudent
          ? (student.parentEmail || student.email || '')
          : student.email; // For school_managers, use their own email
        const parentPhone = isStudent
          ? (student.parentPhone || student.parentInfo?.telephone || '')
          : (student.schoolManagerInfo?.telephone || student.schoolManagerInfo?.cellulaire || '');

        return {
          userId: student._id.toString(),
          firstName: firstName,
          lastName: lastName,
          parentFirstName: parentFirstName,
          parentLastName: parentLastName,
          email: student.email || '',
          parentEmail: parentEmail,
          parentPhone: parentPhone,
          role: student.role, // Include role to distinguish in UI if needed
          metrics: {
            totalSales: Math.round(totalSales * 100) / 100,
            totalProductCost: Math.round(totalProductCost * 100) / 100,
            // Detailed profit breakdown
            studentCashProfit: Math.round(totalStudentCashProfit * 100) / 100,
            studentSchoolAccountProfit: Math.round(totalStudentSchoolAccountProfit * 100) / 100,
            totalStudentProfit: Math.round((totalStudentCashProfit + totalStudentSchoolAccountProfit) * 100) / 100,
            schoolProjectEarnings: Math.round(totalSchoolProjectEarnings * 100) / 100,
            raffleEarnings: Math.round(totalRaffleEarnings * 100) / 100,
            totalDons: Math.round(totalDons * 100) / 100, // Total donations (all tip amounts)
            studentDonations: Math.round(totalStudentDonations * 100) / 100, // Student's portion of donations
            schoolDonations: Math.round(totalSchoolDonations * 100) / 100, // School's portion of donations
            orderCount: orders.length,
            // Payment calculation
            studentPaymentAmount: Math.round((totalSales - totalStudentCashProfit) * 100) / 100
          },
          productBreakdown: productBreakdownArray,
          orders: orders.map(order => ({
            orderId: order.orderId || order._id.toString(),
            customerName: order.customerName || '',
            customerEmail: order.customerEmail || '',
            customerPhone: order.phoneNumber || '',
            products: order.products || [],
            totalAmount: order.totalAmount || 0,
            tip: order.tip || 0,
            createdAt: order.createdAt,
            status: order.status || 'En attente'
          }))
        };
      })
    );

    // Calculate aggregate stats
    const aggregateStats = {
      totalStudents: studentsData.length,
      totalSales: Math.round(studentsData.reduce((sum, s) => sum + s.metrics.totalSales, 0) * 100) / 100,
      totalStudentCashProfit: Math.round(studentsData.reduce((sum, s) => sum + s.metrics.studentCashProfit, 0) * 100) / 100,
      totalStudentSchoolAccountProfit: Math.round(studentsData.reduce((sum, s) => sum + s.metrics.studentSchoolAccountProfit, 0) * 100) / 100,
      totalStudentEarnings: Math.round(studentsData.reduce((sum, s) => sum + s.metrics.totalStudentProfit, 0) * 100) / 100,
      totalSchoolProjectEarnings: Math.round(studentsData.reduce((sum, s) => sum + s.metrics.schoolProjectEarnings, 0) * 100) / 100,
      totalRaffleEarnings: Math.round(studentsData.reduce((sum, s) => sum + s.metrics.raffleEarnings, 0) * 100) / 100,
      totalDons: Math.round(studentsData.reduce((sum, s) => sum + s.metrics.totalDons, 0) * 100) / 100,
      totalStudentDonations: Math.round(studentsData.reduce((sum, s) => sum + (s.metrics.studentDonations || 0), 0) * 100) / 100,
      totalSchoolDonations: Math.round(studentsData.reduce((sum, s) => sum + (s.metrics.schoolDonations || 0), 0) * 100) / 100,
      totalOrders: studentsData.reduce((sum, s) => sum + s.metrics.orderCount, 0),
      totalStudentPaymentAmount: Math.round(studentsData.reduce((sum, s) => sum + s.metrics.studentPaymentAmount, 0) * 100) / 100
    };

    return res.status(200).json({
      students: studentsData,
      aggregateStats,
      campaign: {
        name: campaign.name,
        code: campaign.campaignCode,
        startDate: campaign.startDate,
        endDate: campaign.endDate
      }
    });

  } catch (error) {
    console.error('Error fetching rapport data:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

