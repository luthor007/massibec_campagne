// /pages/api/schools/[schoolId]/raffle.js

import dbConnect from '../../../../lib/mongodb';
import Order from '../../../../models/Order';
import School from '../../../../models/School';
import Campaign from '../../../../models/Campaign';
import { calculateRaffleBenefit, getCampaignDataWithFallback } from '../../../../utils/campaignHelpers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

// Helper function to get campaign IDs for a school
const getCampaignIdsForSchool = async (schoolId) => {
  const campaigns = await Campaign.find({ school: schoolId }).select('_id');
  return campaigns.map(c => c._id);
};

const calculateOrderProfit = (order) => {
  const { products, totalAmount } = order;

  // Check if products exists and is an array
  if (!products || !Array.isArray(products) || products.length === 0) {
    console.warn('Order has no products or products is not an array:', order._id);
    return 0;
  }

  // Calculate total cost of products
  const totalCost = products.reduce((acc, product) => {
    const productCost = product.productCost || 0;
    const quantity = product.quantity || 0;
    return acc + (productCost * quantity);
  }, 0);

  // Profit is total amount minus the cost of the products
  const profit = totalAmount - totalCost;

  return profit;
};

// School year definitions
const schoolYears = {
  '2024-2025': { startDate: '2024-08-01', endDate: '2025-07-31' },
  '2025-2026': { startDate: '2025-08-01', endDate: '2026-07-31' },
  '2026-2027': { startDate: '2026-08-01', endDate: '2027-07-31' }
};

export default async function handler(req, res) {
  const { schoolId } = req.query;
  const { schoolYear = '2025-2026' } = req.body;

  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    // Connect to the database
    await dbConnect();

    // Get the session to authenticate the user
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Get date range for the selected school year
    const yearData = schoolYears[schoolYear];
    if (!yearData) {
      return res.status(400).json({ message: 'Invalid school year' });
    }

    const startDate = new Date(yearData.startDate);
    const endDate = new Date(yearData.endDate);

    // Fetch the school to get fallback split data
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    // Fetch all orders for the given schoolId within the school year period
    // Look for orders with school field OR campaignId that belongs to this school
    const orders = await Order.find({ 
      $or: [
        { school: schoolId },
        { campaignId: { $in: await getCampaignIdsForSchool(schoolId) } }
      ],
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        totalRaffle: '0.00',
        school: school.name,
      });
    }

    // Calculate the total raffle benefit using campaign-specific per-product splits
    let totalRaffle = 0;
    try {
      // Get campaign data with fallback to school data
      const { campaign, fallbackSplit } = await getCampaignDataWithFallback(schoolId, school);
      
      // Calculate raffle benefit using campaign-specific per-product profit splits
      totalRaffle = calculateRaffleBenefit(orders, campaign, fallbackSplit);
    } catch (error) {
      console.error('Error calculating raffle benefit:', error);
      // Fallback to old calculation if campaign helpers fail
      const raffleBenefitPercentage = school.split.raffleBenefit || 5.0;
      totalRaffle = orders.reduce((total, order) => {
        const orderProfit = calculateOrderProfit(order);
        const raffleBenefit = (orderProfit * raffleBenefitPercentage) / 100;
        return total + raffleBenefit;
      }, 0);
    }

    // Return the total raffle amount
    res.status(200).json({
      totalRaffle: totalRaffle.toFixed(2), // Fixed to two decimal places
      school: school.name,
    });

  } catch (error) {
    console.error('Erreur dans l\'API raffle:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
  }
}