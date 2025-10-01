// /pages/api/schools/[schoolId]/student/[studentId]/earnings.js

import dbConnect from '../../../../../../lib/mongodb';
import Order from '../../../../../../models/Order';
import School from '../../../../../../models/School';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]';
import mongoose from 'mongoose';

const calculateOrderProfit = (order, school) => {
  const { products, tip } = order;

  // Calculate total cost of products
  const totalprofit = products.reduce((acc, product) => acc + ((product.productPrice * product.quantity) - (product.productCost * product.quantity) * (school.split.studentBenefit / 100)), 0);

  // Profit is total amount minus the cost of the products
  const profit = totalprofit - tip;

  return profit;
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
    const orders = await Order.find({
      user: new mongoose.Types.ObjectId(studentId),
      school: schoolId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: 'Aucune commande trouvée pour cet étudiant.', weeklyEarnings: [] });
    }

    // Calculate weekly earnings by iterating over the weekly intervals
    const weeklyEarnings = weeklyIntervals.map((interval) => {
      const earningsInWeek = orders.reduce((total, order) => {
        // Check if the order was created within this week's interval
        const orderDate = new Date(order.createdAt);
        if (orderDate >= interval.start && orderDate <= interval.end) {
          const profit = calculateOrderProfit(order, school);
          return total + profit;
        }
        return total;
      }, 0);

      return {
        weekStart: interval.start,
        weekEnd: interval.end,
        earnings: earningsInWeek.toFixed(2),
      };
    });

    // Return the weekly earnings
    res.status(200).json({ weeklyEarnings });

  } catch (error) {
    console.error('Erreur dans l\'API earnings:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
  }
}