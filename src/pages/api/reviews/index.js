import dbConnect from '../../../lib/mongodb';
import Review from '../../../models/Review';
import SchoolManager from '../../../models/SchoolManager';
import SupplierManager from '../../../models/SupplierManager';
import Campaign from '../../../models/Campaign';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return res.status(401).json({ message: 'Non autorisé' });
    }

    const userId = token.sub;
    const userRole = token.role;

    if (req.method === 'GET') {
        try {
            const { supplierId, schoolId, campaignId } = req.query;

            let query = { isVisible: true };

            if (supplierId) {
                query.supplier = supplierId;
            }

            if (schoolId) {
                query.school = schoolId;
            }

            if (campaignId) {
                query.campaign = campaignId;
            }

            // If supplier is requesting, only show their reviews
            if (userRole === 'supplier' && !supplierId) {
                const supplierManager = await SupplierManager.findOne({
                    user: userId,
                    status: 'active'
                }).populate('supplier');

                if (!supplierManager || !supplierManager.supplier) {
                    return res.status(404).json({ message: 'Fournisseur non trouvé' });
                }

                query.supplier = supplierManager.supplier._id;
            }

            const reviews = await Review.find(query)
                .populate('school', 'name logo')
                .populate('supplier', 'name logo')
                .populate('campaign', 'name campaignCode')
                .populate('user', 'name email')
                .sort({ createdAt: -1 })
                .lean();

            // Calculate average rating and review count for supplier
            if (supplierId || (userRole === 'supplier' && query.supplier)) {
                const supplierIdForStats = supplierId || query.supplier;
                const stats = await Review.aggregate([
                    { $match: { supplier: supplierIdForStats, isVisible: true } },
                    {
                        $group: {
                            _id: null,
                            averageRating: { $avg: '$rating' },
                            reviewCount: { $sum: 1 },
                            ratings: {
                                $push: '$rating'
                            }
                        }
                    }
                ]);

                const reviewStats = stats[0] || { averageRating: 0, reviewCount: 0, ratings: [] };

                return res.status(200).json({
                    reviews,
                    stats: {
                        averageRating: reviewStats.averageRating || 0,
                        reviewCount: reviewStats.reviewCount || 0,
                        ratingDistribution: {
                            5: reviewStats.ratings.filter(r => r === 5).length,
                            4: reviewStats.ratings.filter(r => r === 4).length,
                            3: reviewStats.ratings.filter(r => r === 3).length,
                            2: reviewStats.ratings.filter(r => r === 2).length,
                            1: reviewStats.ratings.filter(r => r === 1).length
                        }
                    }
                });
            }

            res.status(200).json({ reviews });
        } catch (error) {
            console.error('Error fetching reviews:', error);
            res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
        }
    } else if (req.method === 'POST') {
        try {
            // Only school managers can create reviews
            if (userRole !== 'school_manager') {
                return res.status(403).json({ message: 'Seuls les gestionnaires d\'école peuvent laisser une révision' });
            }

            const { supplierId, campaignId, rating, comment, categories } = req.body;

            if (!supplierId || !rating) {
                return res.status(400).json({ message: 'supplierId et rating sont requis' });
            }

            if (rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
                return res.status(400).json({ message: 'Rating doit être un entier entre 1 et 5' });
            }

            // Get school for this user
            const schoolManager = await SchoolManager.findOne({
                user: userId,
                status: 'active'
            }).populate('school');

            if (!schoolManager || !schoolManager.school) {
                return res.status(404).json({ message: 'École non trouvée' });
            }

            const schoolId = schoolManager.school._id;

            // Verify campaign belongs to school and supplier if provided
            if (campaignId) {
                const campaign = await Campaign.findById(campaignId).lean();
                if (!campaign) {
                    return res.status(404).json({ message: 'Campagne non trouvée' });
                }
                if (campaign.school.toString() !== schoolId.toString()) {
                    return res.status(403).json({ message: 'Cette campagne n\'appartient pas à votre école' });
                }
                if (campaign.supplier.toString() !== supplierId) {
                    return res.status(403).json({ message: 'Cette campagne n\'est pas associée à ce fournisseur' });
                }
            }

            // Check if review already exists for this school-supplier-campaign combination
            // Use $or to handle both null and undefined for campaign
            const existingReview = await Review.findOne({
                school: schoolId,
                supplier: supplierId,
                $or: [
                    { campaign: campaignId || null },
                    { campaign: { $exists: false } }
                ]
            });

            if (existingReview) {
                // Update existing review
                existingReview.rating = rating;
                existingReview.comment = comment || '';
                existingReview.categories = categories || {};
                existingReview.isVerified = !!campaignId; // Verified if from a campaign
                await existingReview.save();

                // Create notification for supplier
                await createReviewNotification(supplierId, schoolId, existingReview._id, 'updated');

                return res.status(200).json({
                    message: 'Révision mise à jour',
                    review: existingReview
                });
            }

            // Create new review
            const review = new Review({
                school: schoolId,
                supplier: supplierId,
                campaign: campaignId || null,
                user: userId,
                rating: Number(rating),
                comment: comment || '',
                categories: categories || {},
                isVerified: !!campaignId // Verified if from a campaign
            });

            await review.save();

            // Create notification for supplier
            await createReviewNotification(supplierId, schoolId, review._id, 'new');

            // Populate before returning
            await review.populate('school', 'name logo');
            await review.populate('supplier', 'name logo');
            await review.populate('campaign', 'name campaignCode');
            await review.populate('user', 'name email');

            res.status(201).json({
                message: 'Révision créée avec succès',
                review: review.toObject()
            });
        } catch (error) {
            console.error('Error creating review:', error);
            if (error.code === 11000) {
                return res.status(400).json({ message: 'Une révision existe déjà pour cette combinaison école-fournisseur-campagne' });
            }
            res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
    }
}

// Helper function to create notification for supplier
async function createReviewNotification(supplierId, schoolId, reviewId, type) {
    try {
        // Get school name
        const School = (await import('../../../models/School')).default;
        const school = await School.findById(schoolId).select('name').lean();

        // Create notification in the notifications API
        // We'll use a simple approach: store in a notifications collection or use existing system
        // For now, we'll just log it - the notification system can be enhanced later
        console.log(`[Review Notification] ${type === 'new' ? 'New' : 'Updated'} review from ${school?.name || 'Unknown School'} for supplier ${supplierId}`);

        // TODO: Integrate with existing notification system
        // This could be done by calling the notifications API or storing in a Notification model
    } catch (error) {
        console.error('Error creating review notification:', error);
    }
}

