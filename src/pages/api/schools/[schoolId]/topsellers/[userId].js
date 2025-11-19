import dbConnect from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import Order from '../../../../../models/Order';
import School from '../../../../../models/School';
import mongoose from 'mongoose';
import { calculateStudentEarnings, getCampaignDataWithFallback } from '../../../../../utils/campaignHelpers';

const profitRewards = {
  level1: {
    minimum: 1,
    max: 10,
    badge: "Petit vendeur 💰",
    category: "Débutant",
    description: "Tu as gagné tes premiers dollars. C'est un bon début !",
  },
  level2: {
    minimum: 11,
    max: 50,
    badge: "Vendeur en herbe 💵",
    category: "Apprenti",
    description: "Tes profits augmentent, tu progresses bien !",
  },
  level3: {
    minimum: 51,
    max: 100,
    badge: "Vendeur prometteur 💼",
    category: "Intermédiaire",
    description: "Tu maîtrises l'art de vendre. Continue comme ça !",
  },
  level4: {
    minimum: 101,
    max: 200,
    badge: "Vendeur expérimenté 💳",
    category: "Avancé",
    description: "Tes compétences en ventes se confirment avec de beaux profits.",
  },
  level5: {
    minimum: 201,
    max: 300,
    badge: "Pro des profits 🏆",
    category: "Avancé",
    description: "Tu es reconnu pour tes résultats impressionnants en ventes.",
  },
  level6: {
    minimum: 301,
    max: 500,
    badge: "Champion des profits 💎",
    category: "Pro",
    description: "Tu es une star de la vente. Tes profits parlent pour toi.",
  },
  level7: {
    minimum: 501,
    max: 1000,
    badge: "Maître des profits 🏅",
    category: "Expert",
    description: "Tu as atteint un niveau de profit exceptionnel.",
  },
  level8: {
    minimum: 1001,
    max: 2000,
    badge: "Légende des profits 🔥",
    category: "Légende",
    description: "Tu fais partie des meilleurs. Les profits ne cessent de croître.",
  },
  level9: {
    minimum: 2001,
    max: 3000,
    badge: "Titan des profits 🌟",
    category: "Élite",
    description: "Tu fais partie d'une élite de vendeurs, dominant le marché.",
  },
  level10: {
    minimum: 3001,
    max: Infinity,
    badge: "Empereur des profits 👑",
    category: "Ultime",
    description: "Ton succès est incomparable. Tu es une légende vivante.",
  }
};

const calculateTotalEarnings = async (orders, school) => {
  try {
    // Get campaign data with fallback to school data
    const { campaign, fallbackSplit } = await getCampaignDataWithFallback(school._id, school);

    // Calculate earnings using campaign-specific per-product profit splits
    const totalEarnings = calculateStudentEarnings(orders, campaign, fallbackSplit);

    return totalEarnings;
  } catch (error) {
    console.error('Error calculating total earnings:', error);
    // Fallback to old calculation if campaign helpers fail
    let totalEarnings = 0;
    orders.forEach(order => {
      const { products, tip } = order;
      const totalCost = products.reduce((acc, product) => acc + (product.productCost * product.quantity), 0);
      const profitBeforeTips = order.totalAmount - totalCost;
      const studentEarnings = (profitBeforeTips * (school.split.studentBenefit / 100)) + (tip || 0);
      totalEarnings += studentEarnings;
    });
    return totalEarnings;
  }
};

// Function to determine the user's category based on total earnings
const determineUserCategory = (totalEarnings) => {
  for (const level in profitRewards) {
    const reward = profitRewards[level];
    if (totalEarnings >= reward.minimum && totalEarnings <= reward.max) {
      return reward.category;
    }
  }
  return "Noob";
};

// School year definitions
const schoolYears = {
  '2024-2025': { startDate: '2024-08-01', endDate: '2025-07-31' },
  '2025-2026': { startDate: '2025-08-01', endDate: '2026-07-31' },
  '2026-2027': { startDate: '2026-08-01', endDate: '2027-07-31' }
};

const buildCampaignMatchConditions = (campaignId) => {
  if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
    return [];
  }

  const campaignObjectId = new mongoose.Types.ObjectId(campaignId);
  const idAsString = campaignObjectId.toString();

  return [
    { campaignId: campaignObjectId },
    { campaignId: idAsString },
    { campaignId },
    { campaignId: null },
    { campaignId: { $exists: false } }
  ];
};

const buildSchoolFilter = (schoolId) => {
  if (!schoolId) return null;
  const values = [schoolId.toString()];
  if (mongoose.Types.ObjectId.isValid(schoolId)) {
    values.push(new mongoose.Types.ObjectId(schoolId));
  }
  return values.length > 1 ? { $in: values } : values[0];
};

export default async function handler(req, res) {
  const { schoolId, userId } = req.query;
  const { schoolYear = '2025-2026', campaignId } = req.body;

  try {
    await dbConnect();

    // IMPORTANT: When campaignId is provided, get school from campaign, not from schoolId parameter
    // The schoolId parameter may be the user's school (deprecated), but we need the campaign's school
    let finalSchoolId = schoolId;
    let school = null;

    if (campaignId) {
      // Get school from campaign
      const Campaign = (await import('../../../../../models/Campaign')).default;
      const campaign = await Campaign.findById(campaignId).lean();
      if (campaign && campaign.school) {
        finalSchoolId = campaign.school.toString();
        school = await School.findById(finalSchoolId);
      }
    }

    // Fallback to schoolId parameter if campaign not found or no campaignId provided
    if (!school) {
      school = await School.findById(schoolId);
    }

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // If campaignId is provided, use campaign dates instead of school year dates
    let startDate, endDate;
    if (campaignId) {
      const Campaign = (await import('../../../../../models/Campaign')).default;
      const campaign = await Campaign.findById(campaignId).lean();
      if (campaign) {
        // Use campaign dates if available, otherwise use a wide range
        startDate = campaign.startDate ? new Date(campaign.startDate) : new Date('2020-01-01');
        // For end date, use campaign endDate or deliveryDate, or extend far into future
        endDate = campaign.endDate
          ? new Date(campaign.endDate)
          : (campaign.deliveryDate
            ? new Date(campaign.deliveryDate)
            : new Date('2099-12-31'));
        // Add some buffer after campaign end to include all orders
        endDate.setDate(endDate.getDate() + 30); // 30 days buffer
      } else {
        // Campaign not found, fall back to school year
        const yearData = schoolYears[schoolYear];
        if (!yearData) {
          return res.status(400).json({ message: 'Invalid school year' });
        }
        startDate = new Date(yearData.startDate);
        endDate = new Date(yearData.endDate);
      }
    } else {
      // No campaignId, use school year dates
      const yearData = schoolYears[schoolYear];
      if (!yearData) {
        return res.status(400).json({ message: 'Invalid school year' });
      }
      startDate = new Date(yearData.startDate);
      endDate = new Date(yearData.endDate);
    }

    // Fetch all participants in the campaign (students AND school_managers who joined as sellers)
    // IMPORTANT: When campaignId is provided, we should find participants by campaignId, not by schoolId
    // This allows school_managers who joined campaigns from other schools to see the correct leaderboard
    let participants = [];
    if (campaignId) {
      // Find all users (students AND school_managers) who have joined this specific campaign
      const campaignObjectId = mongoose.Types.ObjectId.isValid(campaignId)
        ? new mongoose.Types.ObjectId(campaignId)
        : campaignId;

      participants = await User.find({
        // Include both students and school_managers who joined the campaign
        $or: [
          { 'campaigns.campaignId': campaignObjectId },
          { 'campaigns.campaignId': campaignId },
          { activeCampaignId: campaignObjectId },
          { activeCampaignId: campaignId }
        ]
      });

      console.log(`[TopSellers] Found ${participants.length} participants for campaign ${campaignId}:`,
        participants.map(p => ({ id: p._id.toString(), name: p.name, role: p.role }))
      );
    } else {
      // Fallback: find students by schoolId (legacy behavior)
      participants = await User.find({
        $or: [
          { school: schoolId, role: 'student' },
          { 'campaigns.schoolId': schoolId, role: 'student' }
        ]
      });
    }

    // Rename for clarity - these are participants, not just students
    const students = participants;
    if (!students || students.length === 0) {
      return res.status(200).json({
        topPerformers: [],
        userRank: null,
        userTotalEarnings: '0.00',
        userTotalProductsSold: 0,
        userCategory: 'Noob'
      });
    }

    // Verify the current user is in the participants list
    const currentUserInList = students.find(s => s._id.toString() === userId);
    if (!currentUserInList) {
      console.warn(`[TopSellers] User ${userId} not found in campaign ${campaignId || 'N/A'} participants list`);
    } else {
      console.log(`[TopSellers] User ${userId} (${currentUserInList.name}, role: ${currentUserInList.role}) found in participants list`);
    }

    // Calculate total earnings for each participant (filtered by campaign dates and campaignId)
    const studentData = await Promise.all(students.map(async student => {
      const orderQuery = {
        user: student._id,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      // IMPORTANT: Don't filter by school when campaignId is provided
      // Orders belong to the campaign's school, not the user's school
      // This allows school_managers to see their orders from campaigns of other schools
      if (!campaignId) {
        // Only filter by school if no campaignId (legacy behavior)
        const schoolFilter = buildSchoolFilter(school?._id?.toString() || schoolId);
        if (schoolFilter) {
          orderQuery.school = schoolFilter;
        }
      }

      // Filter by campaignId - convert to ObjectId if needed
      if (campaignId) {
        const campaignObjectId = mongoose.Types.ObjectId.isValid(campaignId)
          ? new mongoose.Types.ObjectId(campaignId)
          : campaignId;
        orderQuery.campaignId = campaignObjectId;
      }

      const orders = await Order.find(orderQuery);

      // Debug logging for the current user
      if (student._id.toString() === userId) {
        console.log(`[TopSellers] User ${userId} orders:`, {
          orderCount: orders.length,
          dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          campaignId,
          orderQuery,
          orderDates: orders.map(o => ({ date: o.createdAt, campaignId: o.campaignId }))
        });
      }

      const totalEarnings = await calculateTotalEarnings(orders, school);
      const totalProductsSold = orders.reduce((acc, order) => {
        const products = Array.isArray(order.products) ? order.products : [];
        return acc + products.reduce((sum, p) => sum + (p.quantity || 0), 0);
      }, 0);

      // Calculate total sales including donations (products before discount + all donations)
      const totalSales = orders.reduce((sum, order) => {
        // Calculate original subtotal from products (before discount)
        const originalSubtotal = order.products?.reduce((productSum, product) => {
          const price = product.productPrice || product.price || 0;
          const quantity = product.quantity || 0;
          return productSum + (price * quantity);
        }, 0) || 0;

        // Add donations (student and school donations)
        const studentDonation = order.studentDonation || order.tip || 0;
        const schoolDonation = order.schoolDonation || 0;
        const totalDonations = studentDonation + schoolDonation;

        return sum + originalSubtotal + totalDonations;
      }, 0);

      const category = determineUserCategory(totalEarnings);
      return { student, totalEarnings, totalProductsSold, totalSales, category };
    }));

    // Ensure all students are included, even those with 0 orders
    // This ensures the current user is always in the list
    const studentDataIds = new Set(studentData.map(s => s.student._id.toString()));
    const missingStudents = students.filter(s => !studentDataIds.has(s._id.toString()));

    // Add missing students with 0 earnings
    missingStudents.forEach(student => {
      studentData.push({
        student,
        totalEarnings: 0,
        totalProductsSold: 0,
        totalSales: 0,
        category: 'Noob'
      });
    });

    // Sort by total earnings (descending), then alphabetically by name (ascending)
    const sortedStudentData = studentData.sort((a, b) => {
      // First sort by total earnings (descending)
      if (b.totalEarnings !== a.totalEarnings) {
        return b.totalEarnings - a.totalEarnings;
      }
      // If earnings are equal, sort alphabetically by name (ascending)
      return a.student.name.localeCompare(b.student.name, 'fr', { sensitivity: 'base' });
    });

    // Get top performers (all students with their rank)
    const topPerformers = sortedStudentData.map(({ student, totalEarnings, totalProductsSold, totalSales, category }, index) => ({
      _id: student._id.toString(),
      userId: student._id.toString(),
      name: student.name,
      rank: index + 1,
      totalEarnings: totalEarnings.toFixed(2),
      totalProductsSold,
      totalSales: totalSales || 0,
      category
    }));

    // Find the current user's rank and earnings
    const currentUserData = sortedStudentData.find(data => data.student._id.toString() === userId);
    const userRankIndex = sortedStudentData.findIndex(data => data.student._id.toString() === userId);
    const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;

    console.log(`[TopSellers] Results for user ${userId}:`, {
      totalStudents: sortedStudentData.length,
      userInList: !!currentUserData,
      userRank,
      topPerformersCount: topPerformers.length,
      dateRange: { startDate, endDate },
      campaignId
    });

    // If user has no orders, they won't be in sortedStudentData
    // But we should still return the leaderboard with other students
    if (!currentUserData) {
      // User not found in sorted data - they might have no orders
      // Return leaderboard anyway, but with null rank
      console.warn(`[TopSellers] User ${userId} not found in sorted data - no orders found`);
      return res.status(200).json({
        topPerformers,
        userRank: null,
        userTotalEarnings: '0.00',
        userTotalProductsSold: 0,
        userCategory: 'Noob'
      });
    }

    // Respond with the top performers, the user's rank/earnings, and their category
    res.status(200).json({
      topPerformers,
      userRank,
      userTotalEarnings: currentUserData.totalEarnings.toFixed(2),
      userTotalProductsSold: currentUserData.totalProductsSold,
      userCategory: currentUserData.category
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data.', error: error.message });
  }
}
