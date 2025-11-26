import dbConnect from '@/lib/mongodb';
import AdminInvitation from '@/models/AdminInvitation';
import AdminManager from '@/models/AdminManager';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const { token: invitationToken } = req.body;

        if (!invitationToken) {
            return res.status(400).json({ message: 'Token d\'invitation requis' });
        }

        // Find invitation
        const invitation = await AdminInvitation.findOne({
            token: invitationToken,
            status: 'pending'
        });

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation non trouvée ou déjà utilisée' });
        }

        // Check if invitation is expired
        if (new Date() > invitation.expiresAt) {
            invitation.status = 'expired';
            await invitation.save();
            return res.status(400).json({ message: 'Cette invitation a expiré' });
        }

        // Get current user
        const user = await User.findById(token.sub);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Verify email matches
        if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
            return res.status(403).json({ message: 'Cette invitation n\'est pas pour votre compte' });
        }

        // Check if user is already an admin manager
        const existingManager = await AdminManager.findOne({
            user: user._id,
            status: 'active'
        });

        if (existingManager) {
            invitation.status = 'accepted';
            await invitation.save();
            return res.status(400).json({ message: 'Vous êtes déjà gestionnaire admin' });
        }

        // Create admin manager record
        const adminManager = new AdminManager({
            user: user._id,
            role: invitation.role,
            invitedBy: invitation.invitedBy,
            joinedAt: new Date()
        });

        await adminManager.save();

        // Mark invitation as accepted
        invitation.status = 'accepted';
        await invitation.save();

        res.status(200).json({
            message: 'Invitation acceptée avec succès',
            adminManager
        });
    } catch (error) {
        console.error('Error accepting admin invitation:', error);
        res.status(500).json({ message: 'Erreur lors de l\'acceptation de l\'invitation', error: error.message });
    }
}

