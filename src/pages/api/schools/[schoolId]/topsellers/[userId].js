import dbConnect from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import Order from '../../../../../models/Order';
import School from '../../../../../models/School';
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

export default async function handler(req, res) {
  const { schoolId, userId } = req.query;
  const { schoolYear = '2025-2026', campaignId } = req.body;

  try {
    await dbConnect();

    // Fetch the school
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Get date range for the selected school year
    const yearData = schoolYears[schoolYear];
    if (!yearData) {
      return res.status(400).json({ message: 'Invalid school year' });
    }

    const startDate = new Date(yearData.startDate);
    const endDate = new Date(yearData.endDate);

    // Fetch all students in the school (both legacy school field and campaign-based)
    const students = await User.find({
      $or: [
        { school: schoolId, role: 'student' },
        { 'campaigns.schoolId': schoolId, role: 'student' }
      ]
    });
    if (!students || students.length === 0) {
      return res.status(200).json({
        topPerformers: [],
        userRank: null,
        userTotalEarnings: '0.00',
        userTotalProductsSold: 0,
        userCategory: 'Noob'
      });
    }

    // Calculate total earnings for each student (filtered by school year and campaign)
    const studentData = await Promise.all(students.map(async student => {
      const orderQuery = {
        user: student._id,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      // Filter by campaign if provided
      if (campaignId) {
        orderQuery.$or = [
          { campaignId: campaignId },
          { campaignId: { $exists: false } },
          { campaignId: null }
        ];
      }

      const orders = await Order.find(orderQuery);
      const totalEarnings = await calculateTotalEarnings(orders, school);
      const totalProductsSold = orders.reduce((acc, order) => acc + order.products.reduce((sum, p) => sum + p.quantity, 0), 0);

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
    const userRank = sortedStudentData.findIndex(data => data.student._id.toString() === userId) + 1;

    if (!currentUserData) {
      return res.status(404).json({ message: 'User not found' });
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