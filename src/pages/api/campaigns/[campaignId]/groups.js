import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return res.status(401).json({ message: 'Non autorisé, pas connecté' });
        }

        const { campaignId } = req.query;

        if (!campaignId) {
            return res.status(400).json({ message: 'ID de campagne requis' });
        }

        // Find the campaign
        const campaign = await Campaign.findById(campaignId)
            .select('groups name campaignCode');

        if (!campaign) {
            return res.status(404).json({ message: 'Campagne non trouvée' });
        }

        // Return groups configuration
        res.status(200).json({
            groups: campaign.groups || { enabled: false, list: [] },
            campaignName: campaign.name,
            campaignCode: campaign.campaignCode
        });

    } catch (error) {
        console.error('Error fetching campaign groups:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des groupes', error: error.message });
    }
}

