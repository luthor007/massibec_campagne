// pages/api/participants.js

import dbConnect from '../../lib/mongodb'; // Ensure this path is correct
import User from '../../models/User';
import Order from '../../models/Order';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      // Extract the token from the request
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas logged in' });
      }

      const userId = token.sub; // Extract the user ID from the token

      const user = await User.findOne({ _id: userId });

      if (!user || user.role !== 'school_manager') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Fetch participants (students) associated with the school
      const participants = await User.find({
        role: 'student',
        school: user.schoolManagerInfo.organisme,
      }).lean(); // Use .lean() for plain JavaScript objects

      if (!participants.length) {
        return res.status(200).json([]); // Return empty array if no participants
      }

      // Initialize an array to hold participants with their orders
      const participantsWithOrders = [];

      // Iterate over each participant to fetch their orders
      await Promise.all(
        participants.map(async (participant) => {
          // Fetch orders for the current participant
          const orders = await Order.find({ user: participant._id })
            .lean(); // Use .lean() for plain JavaScript objects

          // Attach orders to the participant object
          participantsWithOrders.push({
            ...participant,
            orders, // Add the fetched orders
          });
        })
      );

      res.status(200).json(participantsWithOrders);
    } catch (error) {
      console.error('Error fetching participants:', error);
      res.status(500).json({ message: 'Error fetching participants', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}