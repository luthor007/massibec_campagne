// src/pages/api/get-store.js
import dbConnect from '../../lib/mongodb';
import Store from '../../models/Store';
import Campaign from '../../models/Campaign';
import School from '../../models/School';
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

      console.log('[get-store] userId:', userId, 'campaignId:', campaignId);

      let store = null;

      // Handle legacy campaign IDs (format: legacy-{schoolId})
      if (campaignId && typeof campaignId === 'string' && campaignId.startsWith('legacy-')) {
        // Extract schoolId from legacy campaign ID
        const schoolId = campaignId.replace('legacy-', '');

        console.log('[get-store] Legacy campaign detected, schoolId:', schoolId);

        // For legacy campaigns, we need to find an active campaign for the school
        // and use that to find the store
        if (mongoose.Types.ObjectId.isValid(schoolId)) {
          const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

          // Try to find an active campaign for this school
          const activeCampaign = await Campaign.findOne({
            school: schoolObjectId,
            isActive: true
          }).sort({ campaignNumber: -1 });

          if (activeCampaign) {
            console.log('[get-store] Found active campaign for legacy school:', activeCampaign._id);
            // Use the active campaign's ID to find the store
            store = await Store.findOne({
              user: userId,
              campaignId: activeCampaign._id
            });
          } else {
            // No active campaign found - try to find any store for this user
            // (in case there's a store without a proper campaignId)
            console.log('[get-store] No active campaign found, trying to find any store for user');
            store = await Store.findOne({
              user: userId
            });
          }
        } else {
          // Invalid schoolId format - try to find any store for this user
          console.log('[get-store] Invalid schoolId format, trying to find any store for user');
          store = await Store.findOne({
            user: userId
          });
        }
      } else {
        // Normal campaign ID - normalize to ObjectId for consistent comparison
        const normalizedCampaignId = mongoose.Types.ObjectId.isValid(campaignId)
          ? new mongoose.Types.ObjectId(campaignId)
          : campaignId;

        console.log('[get-store] normalizedCampaignId:', normalizedCampaignId);

        // Find store by user and campaignId
        // First try with normalized ObjectId, then fallback to string comparison
        store = await Store.findOne({
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
