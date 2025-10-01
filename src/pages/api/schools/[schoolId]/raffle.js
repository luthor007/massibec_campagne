// /pages/api/schools/[schoolId]/raffle.js

import dbConnect from '../../../../lib/mongodb';
import Order from '../../../../models/Order';
import School from '../../../../models/School';
import { getSession } from 'next-auth/react';

const calculateOrderProfit = (order) => {
  const { products, totalAmount } = order;

  // Calculate total cost of products
  const totalCost = products.reduce((acc, product) => acc + (product.productCost * product.quantity), 0);

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

    // Get date range for the selected school year
    const yearData = schoolYears[schoolYear];
    if (!yearData) {
      return res.status(400).json({ message: 'Invalid school year' });
    }

    const startDate = new Date(yearData.startDate);
    const endDate = new Date(yearData.endDate);

    // Fetch the school to get the raffleBenefit percentage
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    const raffleBenefitPercentage = school.split.raffleBenefit; // e.g., 5%

    // Fetch all orders for the given schoolId within the school year period
    const orders = await Order.find({ 
      school: schoolId,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'Aucune commande trouvée pour cette école.' });
    }

    // Calculate the total raffle benefit by summing up the raffle benefit for each order's profit
    const totalRaffle = orders.reduce((total, order) => {
      const orderProfit = calculateOrderProfit(order);
      const raffleBenefit = (orderProfit * raffleBenefitPercentage) / 100;
      return total + raffleBenefit;
    }, 0);

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