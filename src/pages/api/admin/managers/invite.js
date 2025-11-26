import dbConnect from '@/lib/mongodb';
import { checkAdminAccess } from '@/lib/adminAuth';
import AdminInvitation from '@/models/AdminInvitation';
import AdminManager from '@/models/AdminManager';
import User from '@/models/User';
import crypto from 'crypto';
import { sendManagerInvitationEmail } from '@/utils/emails/managerInvitationEmail';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await dbConnect();

        // Check admin access
        const { authorized, message, user: currentUser } = await checkAdminAccess(req);
        if (!authorized) {
            return res.status(403).json({ message });
        }

        // Only primary admin or admin managers with 'admin' role can invite
        const adminManager = await AdminManager.findOne({
            user: currentUser._id,
            status: 'active'
        });

        const canInvite = currentUser.email?.toLowerCase() === 'alexis.massicotte@icloud.com' ||
            (adminManager && ['owner', 'admin'].includes(adminManager.role));

        if (!canInvite) {
            return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à inviter des gestionnaires' });
        }

        const { email, role } = req.body;

        // Validate input
        if (!email || !role) {
            return res.status(400).json({ message: 'Email et rôle requis' });
        }

        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({ message: 'Rôle invalide. Les rôles valides sont: admin, member' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Format d\'email invalide' });
        }

        // Check if email is already an admin manager
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            const existingManager = await AdminManager.findOne({
                user: existingUser._id,
                status: 'active'
            });

            if (existingManager) {
                return res.status(400).json({ message: 'Cette personne est déjà gestionnaire admin' });
            }
        }

        // Check if there's already a pending invitation
        const existingInvitation = await AdminInvitation.findOne({
            email: email.toLowerCase(),
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (existingInvitation) {
            return res.status(400).json({ message: 'Une invitation est déjà en attente pour cette adresse email' });
        }

        // Generate invitation token
        const invitationToken = crypto.randomBytes(32).toString('hex');

        // Create invitation
        const invitation = new AdminInvitation({
            email: email.toLowerCase(),
            role,
            invitedBy: currentUser._id,
            token: invitationToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        await invitation.save();

        // Build invitation URL
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const invitationUrl = `${baseUrl}/admin-accept-invitation?token=${invitationToken}`;

        // Send invitation email
        try {
            await sendManagerInvitationEmail({
                email: email.toLowerCase(),
                invitationUrl,
                inviterName: currentUser.name || 'Administrateur',
                organizationName: 'Jappuie Admin',
                role: role === 'admin' ? 'Administrateur' : 'Membre'
            });
        } catch (emailError) {
            console.error('Error sending invitation email:', emailError);
            // Don't fail the request if email fails, but log it
        }

        res.status(201).json({
            message: 'Invitation envoyée avec succès',
            invitation: {
                id: invitation._id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt
            }
        });
    } catch (error) {
        console.error('Error inviting admin manager:', error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'invitation', error: error.message });
    }
}

