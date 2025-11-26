import dbConnect from '../../../lib/mongodb';
import { getToken } from 'next-auth/jwt';
import Bid from '../../../models/Bid';
import Shipment from '../../../models/Shipment';

export default async function handler(req, res) {
    await dbConnect();

    // Get user from token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.sub) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const distributorId = token.sub;

    if (req.method === 'GET') {
        // Get all bids for this distributor
        try {
            const { status, limit = 20, page = 1 } = req.query;

            const query = { distributorId };
            if (status) {
                query.status = status;
            }

            const bids = await Bid.find(query)
                .populate({
                    path: 'shipmentId',
                    populate: [
                        { path: 'supplierId', select: 'name address ville codePostal' },
                        { path: 'schoolId', select: 'name address ville codePostal' },
                        { path: 'campaignId', select: 'name' }
                    ]
                })
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit));

            const total = await Bid.countDocuments(query);

            return res.status(200).json({
                bids,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Error fetching bids:', error);
            return res.status(500).json({
                message: 'Error fetching bids',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    if (req.method === 'POST') {
        // Create a new bid
        try {
            const { shipmentId, amount, estimatedDeliveryDate, notes, palletCount, palletPrices } = req.body;

            if (!shipmentId || !estimatedDeliveryDate) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // If palletPrices is provided, use it; otherwise require amount
            if (!palletPrices && !amount) {
                return res.status(400).json({ message: 'Either amount or palletPrices is required' });
            }

            // Validate shipment exists and is in bidding status
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                return res.status(404).json({ message: 'Shipment not found' });
            }

            if (shipment.status !== 'bidding' && shipment.status !== 'pending') {
                return res.status(400).json({ message: 'Shipment is not accepting bids' });
            }

            // Check if bidding period has ended
            if (new Date() > new Date(shipment.biddingEndDate)) {
                return res.status(400).json({ message: 'Bidding period has ended' });
            }

            // Check if distributor already has a bid for this shipment
            const existingBid = await Bid.findOne({
                shipmentId,
                distributorId
            });

            if (existingBid) {
                // Update existing bid
                if (amount) existingBid.amount = parseFloat(amount);
                if (palletCount) existingBid.palletCount = parseInt(palletCount);
                if (palletPrices) {
                    // Convert object to Map
                    const pricesMap = new Map();
                    Object.entries(palletPrices).forEach(([key, value]) => {
                        pricesMap.set(key, parseFloat(value));
                    });
                    existingBid.palletPrices = pricesMap;
                }
                existingBid.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
                existingBid.notes = notes || '';
                existingBid.status = 'pending';
                await existingBid.save();

                // Convert Map to object for JSON response
                const bidObj = existingBid.toObject();
                if (bidObj.palletPrices instanceof Map) {
                    bidObj.palletPrices = Object.fromEntries(bidObj.palletPrices);
                }

                return res.status(200).json({
                    message: 'Bid updated successfully',
                    bid: bidObj
                });
            }

            // Create new bid
            const bidData = {
                shipmentId,
                distributorId,
                estimatedDeliveryDate: new Date(estimatedDeliveryDate),
                notes: notes || '',
                status: 'pending'
            };

            if (amount) bidData.amount = parseFloat(amount);
            if (palletCount) bidData.palletCount = parseInt(palletCount);
            if (palletPrices) {
                // Convert object to Map
                const pricesMap = new Map();
                Object.entries(palletPrices).forEach(([key, value]) => {
                    pricesMap.set(key, parseFloat(value));
                });
                bidData.palletPrices = pricesMap;
            }

            const newBid = new Bid(bidData);

            await newBid.save();

            // Update shipment status to bidding if it's pending
            if (shipment.status === 'pending') {
                shipment.status = 'bidding';
                await shipment.save();
            }

            // Convert Map to object for JSON response
            const bidObj = newBid.toObject();
            if (bidObj.palletPrices instanceof Map) {
                bidObj.palletPrices = Object.fromEntries(bidObj.palletPrices);
            }

            return res.status(201).json({
                message: 'Bid created successfully',
                bid: bidObj
            });

        } catch (error) {
            console.error('Error creating bid:', error);
            return res.status(500).json({
                message: 'Error creating bid',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}

