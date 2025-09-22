// /pages/api/schools/[schoolId]/student/[studentId]/earnings.js

import dbConnect from '../../../../../../lib/mongodb';
import Order from '../../../../../../models/Order';
import School from '../../../../../../models/School';
import { getSession } from 'next-auth/react';
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

export default async function handler(req, res) {
  const { schoolId, studentId } = req.query;

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    // Connect to the database
    await dbConnect();

    // Get the session to authenticate the user
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Fetch the school to get the campaign dates
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    const { debutCampagne, finCampagne } = school;
    if (!debutCampagne || !finCampagne) {
      return res.status(400).json({ message: 'Dates de la campagne manquantes.' });
    }

    // Split the fundraising period into weekly intervals
    const weeklyIntervals = getWeeklyIntervals(new Date(debutCampagne), new Date(finCampagne));

    // Fetch all orders for the given student and school within the campaign period
    const orders = await Order.find({
      user: new mongoose.Types.ObjectId(studentId),
      school: schoolId,
      createdAt: { $gte: new Date(debutCampagne), $lte: new Date(finCampagne) },
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