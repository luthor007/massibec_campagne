import dbConnect from '../../../../../lib/mongodb';
import Campaign from '../../../../../models/Campaign';
import School from '../../../../../models/School';
import Order from '../../../../../models/Order';
import OrderStudent from '../../../../../models/OrderStudent';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import { calculateOrderProfitsDetailed } from '../../../../../utils/campaignHelpers';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        // Extract the token from the request
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return res.status(401).json({ message: 'Non autorisé, pas connecté' });
        }

        // Check if user is supplier (Massibec)
        const User = (await import('../../../../../models/User')).default;
        const user = await User.findById(token.sub).lean();

        if (!user || user.role !== 'fournisseur') {
            return res.status(403).json({ message: 'Seul Massibec peut modifier les répartitions de profits' });
        }

        const { campaignId } = req.query;
        const { profitSplits } = req.body;

        if (!campaignId) {
            return res.status(400).json({ message: 'ID de campagne requis' });
        }

        if (!profitSplits || !Array.isArray(profitSplits)) {
            return res.status(400).json({ message: 'Répartitions de profits requises' });
        }

        // Find the campaign
        let campaign = await Campaign.findById(campaignId).populate('school');
        let school = null;
        let isLegacy = false;

        if (campaign) {
            // Campaign found in separate collection
            school = campaign.school;
        } else {
            // Try to find in legacy school.campaigns array
            const schools = await School.find({
                'campaigns._id': campaignId
            });

            if (schools.length > 0) {
                school = schools[0];
                const campaignData = school.campaigns.id(campaignId);
                if (campaignData) {
                    isLegacy = true;
                } else {
                    return res.status(404).json({ message: 'Campagne non trouvée' });
                }
            } else {
                return res.status(404).json({ message: 'Campagne non trouvée' });
            }
        }

        if (!school) {
            return res.status(404).json({ message: 'École non trouvée' });
        }

        // Convert productId strings to ObjectIds for profitSplits
        const updatedProfitSplits = profitSplits.map(ps => ({
            productId: mongoose.Types.ObjectId.isValid(ps.productId) ? new mongoose.Types.ObjectId(ps.productId) : ps.productId,
            studentCash: ps.studentCash !== undefined ? Number(ps.studentCash) : 0,
            studentSchoolAccount: ps.studentSchoolAccount !== undefined ? Number(ps.studentSchoolAccount) : 0,
            schoolProject: ps.schoolProject !== undefined ? Number(ps.schoolProject) : 0,
            raffle: ps.raffle !== undefined ? Number(ps.raffle) : 0
        }));

        // Update campaign profit splits
        if (isLegacy) {
            // Update legacy campaign in school.campaigns array
            const campaignData = school.campaigns.id(campaignId);
            if (campaignData) {
                campaignData.profitSplits = updatedProfitSplits;
                await school.save();
                campaign = campaignData;
            } else {
                return res.status(404).json({ message: 'Campagne non trouvée dans l\'école' });
            }
        } else {
            // Update campaign in separate collection
            campaign.profitSplits = updatedProfitSplits;
            await campaign.save();
        }

        // Get product names for matching (OrderStudent uses productName, not productId)
        const Product = (await import('../../../../../models/Product')).default;
        const productMap = new Map();
        for (const ps of updatedProfitSplits) {
            const productId = ps.productId?._id?.toString() || ps.productId?.toString();
            if (productId && mongoose.Types.ObjectId.isValid(productId)) {
                const product = await Product.findById(productId).lean();
                if (product) {
                    productMap.set(product.name, ps);
                }
            }
        }

        // Recalculate all OrderStudent records for this campaign
        // OrderStudent uses campaignNumber, not campaignId
        const campaignNumber = campaign.campaignNumber;
        const schoolId = isLegacy ? school._id : campaign.school?._id || campaign.school;

        const orderStudentRecords = await OrderStudent.find({
            school: schoolId,
            campaignNumber: campaignNumber
        });

        console.log(`[update-profit-splits] Found ${orderStudentRecords.length} OrderStudent records to recalculate for campaignNumber ${campaignNumber}`);

        for (const orderStudent of orderStudentRecords) {
            try {
                // Recalculate benefits for each product in the order
                let totalStudentCashBenefit = 0;
                let totalStudentSchoolAccountBenefit = 0;
                let totalSchoolProjectBenefit = 0;
                let totalRaffleBenefit = 0;

                orderStudent.products.forEach(product => {
                    // Match by product name
                    const profitSplit = productMap.get(product.productName);

                    if (profitSplit) {
                        const studentCash = Number(profitSplit.studentCash) || 0;
                        const studentSchoolAccount = Number(profitSplit.studentSchoolAccount) || 0;
                        const schoolProject = Number(profitSplit.schoolProject) || 0;
                        const raffle = Number(profitSplit.raffle) || 0;

                        const productStudentCashBenefit = studentCash * product.quantity;
                        const productStudentSchoolAccountBenefit = studentSchoolAccount * product.quantity;
                        const productSchoolProjectBenefit = schoolProject * product.quantity;
                        const productRaffleBenefit = raffle * product.quantity;

                        // Update product-level benefits
                        product.studentCashBenefit = productStudentCashBenefit;
                        product.studentSchoolAccountBenefit = productStudentSchoolAccountBenefit;
                        product.schoolProjectBenefit = productSchoolProjectBenefit;
                        product.raffleBenefit = productRaffleBenefit;

                        // Update legacy fields for backward compatibility
                        product.studentBenefit = productStudentCashBenefit + productStudentSchoolAccountBenefit;
                        product.organizationBenefit = productSchoolProjectBenefit;

                        totalStudentCashBenefit += productStudentCashBenefit;
                        totalStudentSchoolAccountBenefit += productStudentSchoolAccountBenefit;
                        totalSchoolProjectBenefit += productSchoolProjectBenefit;
                        totalRaffleBenefit += productRaffleBenefit;
                    }
                });

                // Update order-level totals
                orderStudent.studentCashBenefit = totalStudentCashBenefit;
                orderStudent.studentSchoolAccountBenefit = totalStudentSchoolAccountBenefit;
                orderStudent.schoolProjectBenefit = totalSchoolProjectBenefit;
                orderStudent.raffleBenefit = totalRaffleBenefit;

                // Update legacy fields
                orderStudent.studentBenefit = totalStudentCashBenefit + totalStudentSchoolAccountBenefit;
                orderStudent.organizationBenefit = totalSchoolProjectBenefit;

                await orderStudent.save();
            } catch (error) {
                console.error(`[update-profit-splits] Error recalculating OrderStudent ${orderStudent._id}:`, error);
                // Continue with other orders even if one fails
            }
        }

        // Recalculate all Order records for this campaign
        const orderCampaignId = isLegacy ? campaignId : campaign._id;
        const orderRecords = await Order.find({
            campaignId: orderCampaignId
        }).populate('products.product');

        console.log(`[update-profit-splits] Found ${orderRecords.length} Order records to recalculate`);

        // Note: Order records don't store profit split values directly - they're calculated dynamically
        // But we should update tipBreakdown if it exists
        for (const order of orderRecords) {
            try {
                // Get campaign data for calculation
                const campaignForCalc = isLegacy ? null : await Campaign.findById(campaign._id).populate('school');
                const schoolForCalc = isLegacy ? school : campaignForCalc?.school;

                // Get fallback split from school
                const fallbackSplit = schoolForCalc?.split || {
                    studentBenefit: 85.6,
                    organizationBenefit: 9.4,
                    raffleBenefit: 5.0
                };

                // Calculate new profit breakdown using the helper function
                const profitBreakdown = calculateOrderProfitsDetailed(
                    order,
                    campaignForCalc || { profitSplits: updatedProfitSplits, profitSplitType: 'absolute' },
                    fallbackSplit
                );

                // Update tipBreakdown if it exists
                if (order.tipBreakdown) {
                    order.tipBreakdown = {
                        studentCash: profitBreakdown.totalStudentCashBenefit || 0,
                        studentSchoolAccount: profitBreakdown.totalStudentSchoolAccountBenefit || 0,
                        schoolProject: profitBreakdown.totalOrganizationBenefit || 0
                    };
                }

                await order.save();
            } catch (error) {
                console.error(`[update-profit-splits] Error recalculating Order ${order._id}:`, error);
                // Continue with other orders even if one fails
            }
        }

        // Populate productId fields for profitSplits before returning
        if (!isLegacy) {
            await campaign.populate([
                { path: 'profitSplits.productId', select: 'name price cost image' },
                { path: 'customPrices.productId', select: 'name price cost image' },
                { path: 'school', select: 'name code' }
            ]);
        }

        res.status(200).json({
            message: 'Répartitions de profits mises à jour avec succès. Toutes les commandes ont été recalculées.',
            campaign: isLegacy ? {
                _id: campaignId,
                profitSplits: updatedProfitSplits
            } : campaign.toObject(),
            recalculatedOrders: {
                orderStudent: orderStudentRecords.length,
                order: orderRecords.length
            }
        });

    } catch (error) {
        console.error('Error updating profit splits:', error);
        res.status(500).json({
            message: 'Erreur lors de la mise à jour des répartitions de profits',
            error: error.message
        });
    }
}

