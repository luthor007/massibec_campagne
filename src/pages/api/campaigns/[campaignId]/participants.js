import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import User from '../../../../models/User';
import Order from '../../../../models/Order';
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

    // Find the school that owns this campaign
    const school = await School.findOne({
      'campaigns._id': campaignId
    });

    if (!school) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if user is school manager for this school
    const user = await User.findById(token.sub);
    if (!user || user.role !== 'school_manager') {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Verify user belongs to this school
    if (user.schoolManagerInfo?.organisme?.toString() !== school._id.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
    }

    // Find the campaign
    const campaign = school.campaigns.id(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Get all orders for this campaign
    const orders = await Order.find({
      campaignId: campaignId,
      school: school.name
    }).lean();

    // Get unique participants and their details
    const participantIds = [...new Set(orders.map(order => order.user.toString()))];
    
    const participants = await User.find({
      _id: { $in: participantIds },
      role: 'student'
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

      const goal = participant.objectifPersonnel || 1000;
      const progress = goal > 0 ? Math.round((totalSales / goal) * 100) : 0;

      return {
        _id: participant._id,
        name: participant.name,
        email: participant.email,
        totalSales,
        totalUnits,
        goal,
        progress,
        orderCount: participantOrders.length,
        lastOrderDate: participantOrders.length > 0 
          ? Math.max(...participantOrders.map(o => new Date(o.createdAt).getTime()))
          : null
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
        financialGoal: campaign.financialGoal
      }
    });

  } catch (error) {
    console.error('Error fetching campaign participants:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des participants', error: error.message });
  }
}
