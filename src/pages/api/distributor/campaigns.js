import dbConnect from '../../../lib/mongodb';
import { getToken } from 'next-auth/jwt';
import Campaign from '../../../models/Campaign';
import Supplier from '../../../models/Supplier';
import School from '../../../models/School';
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

        // Get all active campaigns
        const campaigns = await Campaign.find({
            status: 'active',
            isActive: true
        })
            .populate('supplier', 'name address ville codePostal phone email')
            .populate('school', 'name address ville codePostal telephone email')
            .sort({ createdAt: -1 })
            .lean();

        // For each campaign, check if there's a shipment and if distributor has bid
        const campaignsWithBidStatus = await Promise.all(
            campaigns.map(async (campaign) => {
                // Find or create shipment for this campaign
                let shipment = await Shipment.findOne({ campaignId: campaign._id }).lean();

                // If no shipment exists, we'll create one on the fly (or return campaign info)
                // For now, we'll return campaign info and let the frontend handle bidding
                if (!shipment) {
                    shipment = {
                        _id: null,
                        campaignId: campaign._id,
                        status: 'bidding',
                        pickupAddress: campaign.supplier?.address || '',
                        pickupCity: campaign.supplier?.ville || '',
                        pickupPostalCode: campaign.supplier?.codePostal || '',
                        deliveryAddress: campaign.school?.address || '',
                        deliveryCity: campaign.school?.ville || '',
                        deliveryPostalCode: campaign.school?.codePostal || '',
                        requestedDeliveryDate: campaign.deliveryDate || campaign.endDate,
                        biddingEndDate: campaign.deliveryDate || campaign.endDate
                    };
                }

                // Check if distributor has already bid on this campaign's shipment
                let currentBid = null;
                let hasBid = false;
                if (shipment._id) {
                    const bid = await Bid.findOne({
                        shipmentId: shipment._id,
                        distributorId: distributorId
                    }).lean();

                    if (bid) {
                        hasBid = true;
                        // Convert palletPrices Map to object if it exists
                        let palletPricesObj = null;
                        if (bid.palletPrices && bid.palletPrices instanceof Map) {
                            palletPricesObj = {};
                            bid.palletPrices.forEach((value, key) => {
                                palletPricesObj[key] = value;
                            });
                        } else if (bid.palletPrices) {
                            palletPricesObj = bid.palletPrices;
                        }

                        currentBid = {
                            amount: bid.amount || null,
                            status: bid.status,
                            createdAt: bid.createdAt,
                            palletCount: bid.palletCount || null,
                            palletPrices: palletPricesObj
                        };
                    }
                }

                // Get all bids for this shipment to show competition
                let bidCount = 0;
                if (shipment._id) {
                    bidCount = await Bid.countDocuments({
                        shipmentId: shipment._id,
                        status: 'pending'
                    });
                }

                return {
                    _id: campaign._id,
                    name: campaign.name || `Campagne #${campaign.campaignNumber}`,
                    campaignNumber: campaign.campaignNumber,
                    supplier: {
                        _id: campaign.supplier?._id,
                        name: campaign.supplier?.name || 'Fournisseur',
                        address: campaign.supplier?.address || '',
                        ville: campaign.supplier?.ville || '',
                        codePostal: campaign.supplier?.codePostal || '',
                        phone: campaign.supplier?.phone || '',
                        email: campaign.supplier?.email || ''
                    },
                    school: {
                        _id: campaign.school?._id,
                        name: campaign.school?.name || 'École',
                        address: campaign.school?.address || '',
                        ville: campaign.school?.ville || '',
                        codePostal: campaign.school?.codePostal || '',
                        telephone: campaign.school?.telephone || '',
                        email: campaign.school?.email || ''
                    },
                    deliveryDate: campaign.deliveryDate || campaign.endDate,
                    endDate: campaign.endDate,
                    shipmentId: shipment._id,
                    hasBid,
                    currentBid,
                    bidCount,
                    status: shipment.status || 'bidding'
                };
            })
        );

        return res.status(200).json({
            campaigns: campaignsWithBidStatus
        });

    } catch (error) {
        console.error('Error fetching campaigns:', error);
        return res.status(500).json({
            message: 'Error fetching campaigns',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
