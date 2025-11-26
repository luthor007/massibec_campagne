import dbConnect from '../../../lib/mongodb';
import { getToken } from 'next-auth/jwt';
import Shipment from '../../../models/Shipment';
import Bid from '../../../models/Bid';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        // Create a new shipment from campaign
        try {
            await dbConnect();

            const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
            if (!token || !token.sub) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const {
                campaignId,
                supplierId,
                schoolId,
                pickupAddress,
                pickupCity,
                pickupPostalCode,
                deliveryAddress,
                deliveryCity,
                deliveryPostalCode,
                requestedDeliveryDate,
                biddingEndDate
            } = req.body;

            if (!campaignId || !supplierId || !schoolId || !pickupAddress || !deliveryAddress || !requestedDeliveryDate) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Check if shipment already exists for this campaign
            let shipment = await Shipment.findOne({ campaignId });

            if (!shipment) {
                // Create new shipment
                shipment = new Shipment({
                    campaignId,
                    supplierId,
                    schoolId,
                    pickupAddress,
                    pickupCity: pickupCity || '',
                    pickupPostalCode: pickupPostalCode || '',
                    deliveryAddress,
                    deliveryCity: deliveryCity || '',
                    deliveryPostalCode: deliveryPostalCode || '',
                    requestedDeliveryDate: new Date(requestedDeliveryDate),
                    biddingEndDate: new Date(biddingEndDate || requestedDeliveryDate),
                    status: 'bidding'
                });

                await shipment.save();
            }

            return res.status(201).json({
                message: 'Shipment created successfully',
                shipment: shipment.toObject()
            });

        } catch (error) {
            console.error('Error creating shipment:', error);
            return res.status(500).json({
                message: 'Error creating shipment',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

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
        const { status, limit = 20, page = 1 } = req.query;

        // Build query
        const query = {};
        if (status) {
            query.status = status;
        } else {
            // Default: show bidding and pending shipments
            query.status = { $in: ['pending', 'bidding'] };
        }

        // Get shipments with populated references
        const shipments = await Shipment.find(query)
            .populate('supplierId', 'name address ville codePostal')
            .populate('schoolId', 'name address ville codePostal')
            .populate('campaignId', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        // For each shipment, check if distributor has already bid
        const shipmentsWithBidStatus = await Promise.all(
            shipments.map(async (shipment) => {
                const bid = await Bid.findOne({
                    shipmentId: shipment._id,
                    distributorId: distributorId
                });

                const shipmentObj = shipment.toObject();
                shipmentObj.hasBid = !!bid;
                shipmentObj.currentBid = bid ? {
                    amount: bid.amount,
                    status: bid.status,
                    createdAt: bid.createdAt
                } : null;

                // Get all bids for this shipment to show competition
                const allBids = await Bid.find({
                    shipmentId: shipment._id,
                    status: 'pending'
                }).countDocuments();
                shipmentObj.bidCount = allBids;

                return shipmentObj;
            })
        );

        const total = await Shipment.countDocuments(query);

        return res.status(200).json({
            shipments: shipmentsWithBidStatus,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching shipments:', error);
        return res.status(500).json({
            message: 'Error fetching shipments',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

