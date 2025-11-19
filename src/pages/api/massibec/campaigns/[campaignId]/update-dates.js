import dbConnect from '../../../../../lib/mongodb';
import Campaign from '../../../../../models/Campaign';
import School from '../../../../../models/School';
import { getToken } from 'next-auth/jwt';

// Helper function to parse date strings without timezone conversion
const parseLocalDate = (dateString) => {
    if (!dateString) return null;

    // If it's already a Date object, use it directly
    if (dateString instanceof Date) {
        return dateString;
    }

    // Handle ISO date strings (e.g., "2025-10-27T00:00:00.000Z")
    // Extract just the date part and create a local date
    const dateOnly = dateString.split('T')[0]; // Get "2025-10-27"
    const [year, month, day] = dateOnly.split('-').map(Number);

    // Create date in local timezone
    return new Date(year, month - 1, day);
};

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
        const mongoose = (await import('mongoose')).default;
        const User = (await import('../../../../../models/User')).default;
        const user = await User.findById(token.sub).lean();

        if (!user || user.role !== 'fournisseur') {
            return res.status(403).json({ message: 'Seul Massibec peut modifier les dates' });
        }

        const { campaignId } = req.query;

        if (!campaignId) {
            return res.status(400).json({ message: 'ID de campagne requis' });
        }

        // Find the campaign - try Campaign collection first, then legacy school.campaigns
        let campaign = await Campaign.findById(campaignId);
        let school = null;
        let isLegacy = false;

        if (campaign) {
            // Campaign found in separate collection
            school = await School.findById(campaign.school._id || campaign.school);
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

        const { startDate, endDate, deliveryDate } = req.body;

        // Validate required fields
        if (!startDate || !endDate || !deliveryDate) {
            return res.status(400).json({ message: 'Toutes les dates sont requises' });
        }

        // Parse dates
        const start = parseLocalDate(startDate);
        const end = parseLocalDate(endDate);
        const delivery = parseLocalDate(deliveryDate);

        // Normalize times for comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        delivery.setHours(0, 0, 0, 0);

        // Basic validation (end must be after start)
        if (end <= start) {
            return res.status(400).json({ message: 'La date de fin doit être après la date de début' });
        }

        // Note: We skip the 3-week validation for Massibec (supplier)
        // This is the key difference from the regular update endpoint

        if (isLegacy) {
            // Update legacy campaign in school.campaigns array
            const campaignData = school.campaigns.id(campaignId);
            if (campaignData) {
                // Update both field name variations for compatibility
                campaignData.startDate = start;
                campaignData.debutCampagne = start;
                campaignData.endDate = end;
                campaignData.finCampagne = end;
                campaignData.deliveryDate = delivery;
                campaignData.dateDeLivraison = delivery;
                await school.save();
            } else {
                return res.status(404).json({ message: 'Campagne non trouvée dans l\'école' });
            }
        } else {
            // Update campaign in separate collection
            campaign.startDate = start;
            campaign.endDate = end;
            campaign.deliveryDate = delivery;
            await campaign.save();
        }

        res.status(200).json({
            message: 'Dates mises à jour avec succès',
            campaign: {
                _id: campaignId,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                deliveryDate: delivery.toISOString()
            }
        });

    } catch (error) {
        console.error('Error updating campaign dates:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour des dates', error: error.message });
    }
}

