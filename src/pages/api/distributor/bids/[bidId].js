import dbConnect from '../../../../lib/mongodb';
import { getToken } from 'next-auth/jwt';
import Bid from '../../../../models/Bid';

export default async function handler(req, res) {
    await dbConnect();

    // Get user from token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.sub) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const distributorId = token.sub;
    const { bidId } = req.query;

    if (req.method === 'PUT') {
        // Update a bid
        try {
            const { amount, estimatedDeliveryDate, notes } = req.body;

            const bid = await Bid.findById(bidId);
            if (!bid) {
                return res.status(404).json({ message: 'Bid not found' });
            }

            // Verify bid belongs to this distributor
            if (bid.distributorId.toString() !== distributorId) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            // Can only update pending bids
            if (bid.status !== 'pending') {
                return res.status(400).json({ message: 'Can only update pending bids' });
            }

            if (amount !== undefined) bid.amount = parseFloat(amount);
            if (estimatedDeliveryDate) bid.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
            if (notes !== undefined) bid.notes = notes;

            await bid.save();

            return res.status(200).json({
                message: 'Bid updated successfully',
                bid
            });

        } catch (error) {
            console.error('Error updating bid:', error);
            return res.status(500).json({
                message: 'Error updating bid',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    if (req.method === 'DELETE') {
        // Withdraw a bid
        try {
            const bid = await Bid.findById(bidId);
            if (!bid) {
                return res.status(404).json({ message: 'Bid not found' });
            }

            // Verify bid belongs to this distributor
            if (bid.distributorId.toString() !== distributorId) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            // Can only withdraw pending bids
            if (bid.status !== 'pending') {
                return res.status(400).json({ message: 'Can only withdraw pending bids' });
            }

            bid.status = 'withdrawn';
            await bid.save();

            return res.status(200).json({
                message: 'Bid withdrawn successfully'
            });

        } catch (error) {
            console.error('Error withdrawing bid:', error);
            return res.status(500).json({
                message: 'Error withdrawing bid',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}

