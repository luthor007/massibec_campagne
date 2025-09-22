import dbConnect from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import Order from '../../../../../models/Order';
import School from '../../../../../models/School';

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

const calculateTotalEarnings = (orders, school) => {
  let totalEarnings = 0;

  orders.forEach(order => {
    const { products, tip } = order;
    const totalCost = products.reduce((acc, product) => acc + (product.productCost * product.quantity), 0);
    const profitBeforeTips = order.totalAmount - totalCost;
    const studentEarnings = (profitBeforeTips * (school.split.studentBenefit / 100)) + (tip || 0);
    totalEarnings += studentEarnings;
  });

  return totalEarnings;
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

export default async function handler(req, res) {
  const { schoolId, userId } = req.query;

  try {
    await dbConnect();

    // Fetch the school
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Fetch all students in the school
    const students = await User.find({ school: schoolId, role: 'student' });
    if (!students || students.length === 0) {
      return res.status(404).json({ message: 'No students found for this school.' });
    }

    // Calculate total earnings for each student
    const studentData = await Promise.all(students.map(async student => {
      const orders = await Order.find({ user: student._id });
      const totalEarnings = calculateTotalEarnings(orders, school);
      const totalProductsSold = orders.reduce((acc, order) => acc + order.products.reduce((sum, p) => sum + p.quantity, 0), 0);
      const category = determineUserCategory(totalEarnings);
      return { student, totalEarnings, totalProductsSold, category };
    }));

    // Sort by total earnings and get the top 3 sellers
    const topPerformers = studentData
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .map(({ student, totalEarnings, totalProductsSold, category }) => ({
        name: student.name,
        totalEarnings: totalEarnings.toFixed(2),
        totalProductsSold,
        category
      }));

    // Find the current user's rank and earnings
    const currentUserData = studentData.find(data => data.student._id.toString() === userId);
    const userRank = studentData
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .findIndex(data => data.student._id.toString() === userId) + 1;

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