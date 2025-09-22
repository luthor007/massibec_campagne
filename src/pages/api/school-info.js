// src/pages/api/school-info.js

import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import { getToken } from 'next-auth/jwt';  // Import getToken

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      // Extract the token from the request
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas connecté' });
      }

      const userId = token.sub;  // Extract the user ID from the token

      const user = await User.findById(userId).lean();  // Use .lean() for plain JS object

      if (!user || user.role !== 'school_manager') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Await the findById call and use .lean()
      const school = await School.findById(user.schoolManagerInfo.organisme).lean();

      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      // Optionally, you can structure the response data as needed
      const schoolInfo = {
        id: school._id,
        name: school.name,
        objectifFinancier: school.objectifFinancier,
        totalRaised: school.totalRaised || 0,  // Ensure totalRaised exists
        code: school.code
        // Add other relevant fields
      };

      res.status(200).json(schoolInfo);
    } catch (error) {
      console.error('Error fetching school info:', error);
      res.status(500).json({ message: 'Error fetching school info', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}