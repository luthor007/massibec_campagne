import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        const { campaignId } = req.query;
        const { token } = req.query;

        if (!campaignId || !token) {
            return res.status(400).json({
                valid: false,
                message: 'ID de campagne et token requis'
            });
        }

        // Find campaign
        const campaign = await Campaign.findById(campaignId)
            .populate('school', 'name code')
            .lean();

        if (!campaign) {
            return res.status(404).json({
                valid: false,
                message: 'Campagne non trouvée'
            });
        }

        // Check if campaign is active or approved
        if (!['pending_approval', 'approved', 'active'].includes(campaign.status)) {
            return res.status(400).json({
                valid: false,
                message: 'Cette campagne n\'est pas disponible pour rejoindre'
            });
        }

        // Find matching token
        if (!campaign.joinTokens || !Array.isArray(campaign.joinTokens)) {
            return res.status(400).json({
                valid: false,
                message: 'Token invalide'
            });
        }

        const joinToken = campaign.joinTokens.find(
            t => t.token === token && new Date(t.expiresAt) > new Date()
        );

        if (!joinToken) {
            return res.status(400).json({
                valid: false,
                message: 'Token invalide ou expiré'
            });
        }

        res.status(200).json({
            valid: true,
            campaign: {
                _id: campaign._id.toString(),
                name: campaign.name,
                campaignNumber: campaign.campaignNumber,
                campaignCode: campaign.campaignCode,
                school: campaign.school,
                groups: campaign.groups || null // Include groups info if available
            }
        });

    } catch (error) {
        console.error('Error validating join token:', error);
        res.status(500).json({
            valid: false,
            message: 'Erreur lors de la validation du token',
            error: error.message
        });
    }
}



