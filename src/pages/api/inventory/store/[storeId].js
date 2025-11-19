// pages/api/inventory/store/[storeId].js

import dbConnect from '../../../../lib/mongodb';
import StudentInventory from '../../../../models/StudentInventory';
import Store from '../../../../models/Store';
import mongoose from 'mongoose';

export default async function handler(req, res) {
    await dbConnect();

    const { storeId } = req.query;

    if (req.method === 'GET') {
        try {
            if (!storeId) {
                return res.status(400).json({ message: 'storeId is required' });
            }

            // Try to find store by slug first, then by ID
            // Check if it's a valid MongoDB ObjectId (24 hex characters)
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(storeId);
            let store;

            if (isObjectId) {
                // Try ID first
                store = await Store.findById(storeId).lean();
            } else {
                // Try slug (each store has its own unique slug)
                store = await Store.findOne({ slug: storeId }).lean();

                // If still not found and it's a valid ObjectId format, try it
                if (!store && mongoose.Types.ObjectId.isValid(storeId)) {
                    store = await Store.findById(storeId).lean();
                }
            }

            if (!store) {
                return res.status(404).json({ message: 'Store not found' });
            }

            const userId = store.user?.toString();
            if (!userId) {
                return res.status(400).json({ message: 'Store has no owner' });
            }

            // Get campaignId from store
            let campaignId = store.campaignId?.toString();

            // If no campaignId on store, try to find it from user's active campaign
            if (!campaignId) {
                const User = (await import('../../../../models/User')).default;
                const userDoc = await User.findById(userId).lean();
                if (userDoc?.activeCampaignId) {
                    campaignId = userDoc.activeCampaignId.toString();
                    console.log(`[Store Inventory API] Using campaignId from user activeCampaignId: ${campaignId}`);
                }
            }

            if (!campaignId) {
                // Return empty inventory if no campaign
                console.log(`[Store Inventory API] No campaignId found for store ${storeId}`);
                return res.status(200).json({ inventory: {} });
            }

            // Get inventory map for this user and campaign
            console.log(`[Store Inventory API] Fetching inventory for userId: ${userId}, campaignId: ${campaignId}`);

            // Also check what inventory records exist for this user (for debugging)
            const allUserInventory = await StudentInventory.find({ userId }).lean();
            console.log(`[Store Inventory API] Total inventory records for user: ${allUserInventory.length}`);
            if (allUserInventory.length > 0) {
                console.log(`[Store Inventory API] Inventory campaigns:`, allUserInventory.map(inv => ({
                    product: inv.productName,
                    campaignId: inv.campaignId?.toString(),
                    ordered: inv.orderedQuantity,
                    available: inv.availableQuantity
                })));
            }

            const inventoryMap = await StudentInventory.getInventoryMap(userId, campaignId);
            console.log(`[Store Inventory API] Found ${Object.keys(inventoryMap).length} products in inventory for campaignId ${campaignId}`);

            res.status(200).json({ inventory: inventoryMap });
        } catch (error) {
            console.error('Error fetching store inventory:', error);
            res.status(500).json({ message: 'Error fetching store inventory', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ message: 'Method not allowed' });
    }
}

