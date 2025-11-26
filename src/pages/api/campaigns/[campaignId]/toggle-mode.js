import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const { campaignId } = req.query;
        const { mode } = req.body;

        if (!mode || !['test', 'production'].includes(mode)) {
            return res.status(400).json({ message: 'Mode invalide. Doit être "test" ou "production"' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campagne non trouvée' });
        }

        // Check if user is school manager for this campaign
        const user = await (await import('../../../../models/User')).default.findById(token.sub);
        if (!user) {
            return res.status(401).json({ message: 'Utilisateur non trouvé' });
        }

        // Verify user has access to this campaign's school
        const School = (await import('../../../../models/School')).default;
        const school = await School.findById(campaign.school);
        if (!school) {
            return res.status(404).json({ message: 'École non trouvée' });
        }

        // Check if user is a manager of this school (allow school_manager or supplier)
        const SchoolManager = (await import('../../../../models/SchoolManager')).default;
        const schoolManager = await SchoolManager.findOne({
            user: token.sub,
            school: school._id,
            status: 'active'
        });

        // Also check legacy schoolManagerInfo for backward compatibility
        const hasLegacyAccess = user.schoolManagerInfo?.organisme?.toString() === school._id.toString();

        // Allow school_manager or supplier (suppliers can toggle mode for their auto-created school)
        if (!schoolManager && !hasLegacyAccess && user.role !== 'school_manager' && user.role !== 'supplier') {
            return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette campagne' });
        }

        // Update campaign mode
        campaign.mode = mode;
        await campaign.save();

        res.status(200).json({
            message: `Campagne passée en mode ${mode === 'test' ? 'test' : 'production'}`,
            campaign: campaign.toObject()
        });
    } catch (error) {
        console.error('Error toggling campaign mode:', error);
        res.status(500).json({ message: 'Erreur lors de la modification du mode', error: error.message });
    }
}

