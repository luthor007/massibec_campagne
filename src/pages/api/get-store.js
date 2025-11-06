// src/pages/api/get-store.js
import dbConnect from '../../lib/mongodb';
import Store from '../../models/Store';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ message: 'campaignId is required' });
    }

    try {
      // Get userId from token
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = token.sub;

      // Normalize campaignId to ObjectId for consistent comparison
      const normalizedCampaignId = mongoose.Types.ObjectId.isValid(campaignId)
        ? new mongoose.Types.ObjectId(campaignId)
        : campaignId;

      console.log('[get-store] userId:', userId, 'campaignId:', campaignId, 'normalizedCampaignId:', normalizedCampaignId);

      // Find store by user and campaignId
      // First try with normalized ObjectId, then fallback to string comparison
      let store = await Store.findOne({
        user: userId,
        campaignId: normalizedCampaignId
      });

      // If not found with ObjectId, try with string (for backwards compatibility)
      if (!store) {
        store = await Store.findOne({
          user: userId,
          campaignId: campaignId
        });
      }

      console.log('[get-store] Store found:', !!store, store ? `Store ID: ${store._id}` : 'No store');

      if (store) {
        res.status(200).json({
          storeId: store._id.toString(),
          slug: store.slug || null
        });
      } else {
        res.status(404).json({ message: 'Store not found' });
      }
    } catch (error) {
      console.error('Error in get-store:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
