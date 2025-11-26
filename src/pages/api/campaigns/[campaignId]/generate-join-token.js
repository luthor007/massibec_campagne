import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        // Verify authentication
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const { campaignId } = req.query;

        if (!campaignId) {
            return res.status(400).json({ message: 'ID de campagne requis' });
        }

        // Find campaign
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campagne non trouvée' });
        }

        // Generate secure token
        const joinToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Token expires in 30 days

        // Add token to campaign's joinTokens array
        if (!campaign.joinTokens) {
            campaign.joinTokens = [];
        }

        campaign.joinTokens.push({
            token: joinToken,
            expiresAt: expiresAt,
            usedBy: [],
            createdAt: new Date()
        });

        await campaign.save();

        // Build join URL
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const joinUrl = `${baseUrl}/join-campaign?campaignId=${campaignId}&token=${joinToken}`;

        res.status(200).json({
            token: joinToken,
            joinUrl: joinUrl,
            expiresAt: expiresAt
        });

    } catch (error) {
        console.error('Error generating join token:', error);
        res.status(500).json({
            message: 'Erreur lors de la génération du token',
            error: error.message
        });
    }
}



