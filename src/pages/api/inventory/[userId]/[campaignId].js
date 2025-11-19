// pages/api/inventory/[userId]/[campaignId].js

import dbConnect from '../../../../lib/mongodb';
import StudentInventory from '../../../../models/StudentInventory';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req, res) {
    await dbConnect();

    const { userId, campaignId } = req.query;

    if (req.method === 'GET') {
        try {
            // Verify authentication
            const session = await getServerSession(req, res, authOptions);
            if (!session || !session.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Verify user can access this inventory (must be the owner or admin)
            const sessionUserId = session.user.id;
            if (sessionUserId !== userId && session.user.role !== 'fournisseur' && session.user.role !== 'school_manager') {
                return res.status(403).json({ message: 'Forbidden: You can only access your own inventory' });
            }

            if (!userId || !campaignId) {
                return res.status(400).json({ message: 'userId and campaignId are required' });
            }

            const inventory = await StudentInventory.getInventory(userId, campaignId);

            res.status(200).json({ inventory });
        } catch (error) {
            console.error('Error fetching inventory:', error);
            res.status(500).json({ message: 'Error fetching inventory', error: error.message });
        }
    } else if (req.method === 'POST') {
        try {
            // Verify authentication
            const session = await getServerSession(req, res, authOptions);
            if (!session || !session.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Verify user can update this inventory (must be the owner)
            const sessionUserId = session.user.id;
            if (sessionUserId !== userId) {
                return res.status(403).json({ message: 'Forbidden: You can only update your own inventory' });
            }

            if (!userId || !campaignId) {
                return res.status(400).json({ message: 'userId and campaignId are required' });
            }

            const { productName, orderedQuantity, soldQuantity } = req.body;

            if (!productName) {
                return res.status(400).json({ message: 'productName is required' });
            }

            const inventory = await StudentInventory.updateInventory(
                userId,
                campaignId,
                productName,
                orderedQuantity,
                soldQuantity
            );

            res.status(200).json({ inventory });
        } catch (error) {
            console.error('Error updating inventory:', error);
            res.status(500).json({ message: 'Error updating inventory', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ message: 'Method not allowed' });
    }
}


