import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';
import Order from '../../../../models/Order';
import User from '../../../../models/User';
import { getToken } from 'next-auth/jwt';

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

    // Find the campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if user is school manager for this school
    const user = await User.findById(token.sub);
    if (!user || user.role !== 'school_manager') {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Verify user belongs to this school
    if (user.schoolManagerInfo?.organisme?.toString() !== campaign.school.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
    }

    // Get all orders for this campaign
    const orders = await Order.find({
      campaignId: campaignId
    }).lean();

    // Calculate statistics
    const totalRaised = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Get unique participants
    const participantIds = [...new Set(orders.map(order => order.user.toString()))];
    const participantCount = participantIds.length;

    // Calculate products sold
    const productsSold = orders.reduce((sum, order) => {
      return sum + order.products.reduce((orderSum, product) => orderSum + product.quantity, 0);
    }, 0);

    // Calculate top sellers
    const sellerStats = {};
    orders.forEach(order => {
      const userId = order.user.toString();
      if (!sellerStats[userId]) {
        sellerStats[userId] = {
          userId,
          totalSales: 0,
          orderCount: 0
        };
      }
      sellerStats[userId].totalSales += order.totalAmount;
      sellerStats[userId].orderCount += 1;
    });

    // Get top sellers and fetch their names
    const topSellersUnsorted = Object.values(sellerStats)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 3);

    // Fetch user names for top sellers
    const topSellers = await Promise.all(
      topSellersUnsorted.map(async (seller) => {
        const user = await User.findById(seller.userId);
        return {
          userId: seller.userId,
          userName: user ? user.name : 'Utilisateur inconnu',
          totalSales: seller.totalSales,
          orderCount: seller.orderCount
        };
      })
    );

    // Calculate goal progress
    const goalProgress = campaign.financialGoal > 0 
      ? Math.round((totalRaised / campaign.financialGoal) * 100) 
      : 0;

    const stats = {
      totalRaised,
      participantCount,
      productsSold,
      topSellers,
      goalProgress,
      financialGoal: campaign.financialGoal,
      campaignNumber: campaign.campaignNumber,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      deliveryDate: campaign.deliveryDate
    };

    res.status(200).json(stats);

  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques', error: error.message });
  }
}
