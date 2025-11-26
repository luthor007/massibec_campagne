import dbConnect from '../../../lib/mongodb';
import { getToken } from 'next-auth/jwt';
import Bid from '../../../models/Bid';
import Shipment from '../../../models/Shipment';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        // Get user from token
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || !token.sub) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const distributorId = token.sub;

        // Get active bids (pending status)
        const activeBids = await Bid.countDocuments({
            distributorId,
            status: 'pending'
        });

        // Get won bids (accepted or selected)
        const wonBids = await Bid.countDocuments({
            distributorId,
            $or: [
                { status: 'accepted' },
                { isSelected: true }
            ]
        });

        // Calculate total revenue from selected bids
        const selectedBids = await Bid.find({
            distributorId,
            isSelected: true
        }).select('amount');

        const totalRevenue = selectedBids.reduce((sum, bid) => sum + (bid.amount || 0), 0);

        // Get pending shipments (awarded but not delivered)
        const pendingShipments = await Shipment.countDocuments({
            selectedDistributorId: distributorId,
            status: { $in: ['awarded', 'in_transit'] }
        });

        return res.status(200).json({
            activeBids,
            wonBids,
            totalRevenue,
            pendingShipments
        });

    } catch (error) {
        console.error('Error fetching distributor stats:', error);
        return res.status(500).json({
            message: 'Error fetching stats',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

