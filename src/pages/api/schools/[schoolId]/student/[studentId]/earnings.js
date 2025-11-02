// /pages/api/schools/[schoolId]/student/[studentId]/earnings.js

import dbConnect from '../../../../../../lib/mongodb';
import Order from '../../../../../../models/Order';
import School from '../../../../../../models/School';
import Campaign from '../../../../../../models/Campaign';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]';
import mongoose from 'mongoose';
import { calculateOrderProfits, getCampaignDataWithFallback } from '../../../../../../utils/campaignHelpers';

// Helper function to get campaign IDs for a school
const getCampaignIdsForSchool = async (schoolId) => {
  const campaigns = await Campaign.find({ school: schoolId }).select('_id');
  return campaigns.map(c => c._id);
};

const calculateOrderProfit = async (order, school) => {
  try {
    // Get campaign data with fallback to school data
    const { campaign, fallbackSplit } = await getCampaignDataWithFallback(school._id, school);
    
    // Calculate order profits using campaign-specific per-product profit splits
    const orderProfits = calculateOrderProfits(order, campaign, fallbackSplit);
    
    // Return student benefit plus tip
    return orderProfits.totalStudentBenefit + (order.tip || 0);
  } catch (error) {
    console.error('Error calculating order profit:', error);
    // Fallback to old calculation if campaign helpers fail
    const { products, tip } = order;
    const totalprofit = products.reduce((acc, product) => 
      acc + ((product.productPrice * product.quantity) - (product.productCost * product.quantity) * (school.split.studentBenefit / 100)), 0);
    return totalprofit + (tip || 0);
  }
};

// Helper function to split a date range into weekly intervals
const getWeeklyIntervals = (startDate, endDate) => {
  const weeks = [];
  let currentStart = new Date(startDate);
  while (currentStart <= endDate) {
    let currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 6); // End of the week
    if (currentEnd > endDate) {
      currentEnd = endDate;
    }
    weeks.push({ start: new Date(currentStart), end: new Date(currentEnd) });
    currentStart.setDate(currentStart.getDate() + 7); // Move to next week
  }
  return weeks;
};

// School year definitions
const schoolYears = {
  '2024-2025': { startDate: '2024-08-01', endDate: '2025-07-31' },
  '2025-2026': { startDate: '2025-08-01', endDate: '2026-07-31' },
  '2026-2027': { startDate: '2026-08-01', endDate: '2027-07-31' }
};

export default async function handler(req, res) {
  const { schoolId, studentId } = req.query;
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

    // Fetch the school to get the campaign dates
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    // Split the school year period into weekly intervals
    const weeklyIntervals = getWeeklyIntervals(startDate, endDate);

    // Fetch all orders for the given student and school within the school year period
    // Look for orders with school field OR campaignId that belongs to this school
    const campaignIds = await getCampaignIdsForSchool(schoolId);
    const orders = await Order.find({
      user: new mongoose.Types.ObjectId(studentId),
      $or: [
        { school: schoolId },
        { campaignId: { $in: campaignIds } }
      ],
      createdAt: { $gte: startDate, $lte: endDate },
    });

    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: 'Aucune commande trouvée pour cet étudiant.', weeklyEarnings: [] });
    }

    // Calculate weekly earnings by iterating over the weekly intervals
    const weeklyEarnings = await Promise.all(weeklyIntervals.map(async (interval) => {
      const earningsInWeek = await orders.reduce(async (totalPromise, order) => {
        const total = await totalPromise;
        // Check if the order was created within this week's interval
        const orderDate = new Date(order.createdAt);
        if (orderDate >= interval.start && orderDate <= interval.end) {
          const profit = await calculateOrderProfit(order, school);
          return total + profit;
        }
        return total;
      }, Promise.resolve(0));

      return {
        weekStart: interval.start,
        weekEnd: interval.end,
        earnings: earningsInWeek.toFixed(2),
      };
    }));

    // Return the weekly earnings
    res.status(200).json({ weeklyEarnings });

  } catch (error) {
    console.error('Erreur dans l\'API earnings:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
  }
}