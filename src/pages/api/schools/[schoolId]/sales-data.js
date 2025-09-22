import connectDB from '../../../../lib/mongodb';
import School from '../../../../models/School';
import Order from '../../../../models/Order';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await connectDB();

  const { schoolId } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found.' });
    }

    // Fetch all orders related to the school
    const orders = await Order.find({ school: schoolId }).lean();

    // Extract unique product names
    const uniqueProducts = [
      ...new Set(
        orders.flatMap(order => 
          order.products.map(product => product.name || product.productName)
        )
      ),
    ];

    // Initialize live data
    const liveData = {};
    uniqueProducts.forEach(product => {
      liveData[product] = 0;
    });
    liveData['Total Sales'] = 0;

    // Aggregate live data from all orders
    orders.forEach(order => {
      order.products.forEach(product => {
        const productName = product.name || product.productName;
        if (liveData[productName] !== undefined) {
          liveData[productName] += product.quantity;
        } else {
          liveData[productName] = product.quantity;
        }
      });
      liveData['Total Sales'] += order.totalAmount;
    });

    // Calculate prediction data (10% increase)
    const predictionData = {};
    uniqueProducts.forEach(product => {
      predictionData[product] = Math.round(liveData[product] * 1.1);
    });
    predictionData['Total Sales'] = parseFloat((liveData['Total Sales'] * 1.1).toFixed(2));

    res.status(200).json({
      products: uniqueProducts,
      data: {
        live: liveData,
        prediction: predictionData,
      },
    });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
} 