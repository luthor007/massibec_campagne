import dbConnect from '../../../../lib/mongodb';
import SupplierManager from '../../../../models/SupplierManager';
import Supplier from '../../../../models/Supplier';
import User from '../../../../models/User';
import ManagerInvitation from '../../../../models/ManagerInvitation';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';
import { sendManagerInvitationEmail } from '@/utils/emails/managerInvitationEmail';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const { email, role } = req.body;

        // Validate input
        if (!email || !role) {
            return res.status(400).json({ message: 'Email et rôle requis' });
        }

        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({ message: 'Rôle invalide' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Format d\'email invalide' });
        }

        // Get the inviting user
        const invitingUser = await User.findById(token.sub);
        if (!invitingUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Get supplier manager record
        const supplierManager = await SupplierManager.findOne({
            user: token.sub,
            status: 'active'
        }).populate('supplier');

        if (!supplierManager || !supplierManager.supplier) {
            return res.status(404).json({ message: 'Fournisseur non trouvé' });
        }

        // Check if user can invite managers
        if (!['owner', 'admin'].includes(supplierManager.role)) {
            return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à inviter des gestionnaires' });
        }

        const supplier = supplierManager.supplier;
        const supplierId = supplier._id;

        // Check if email is already a manager
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            const existingManager = await SupplierManager.findOne({
                supplier: supplierId,
                user: existingUser._id,
                status: 'active'
            });

            if (existingManager) {
                return res.status(400).json({ message: 'Cette personne est déjà gestionnaire de cette organisation' });
            }
        }

        // Generate invitation token
        const invitationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

        // Store invitation in supplier model (or create a separate ManagerInvitation model)
        // For now, we'll use a simple approach and send the email directly
        // The user will register and then we'll create the SupplierManager record

        // Build invitation URL
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const invitationUrl = `${baseUrl}/inscription-manager-supplier?token=${invitationToken}&supplierId=${supplierId}&role=${role}`;

        // Send invitation email
        try {
            await sendManagerInvitationEmail({
                to: email.toLowerCase(),
                schoolName: supplier.name || 'Votre organisation',
                inviterName: invitingUser.name,
                role: role === 'admin' ? 'Administrateur' : 'Membre',
                invitationUrl,
                expiresIn: '7 jours'
            });
        } catch (emailError) {
            console.error('Error sending invitation email:', emailError);
            // Continue even if email fails - we can still create the invitation
        }

        // Check if there's already a pending invitation
        const existingInvitation = await ManagerInvitation.findOne({
            email: email.toLowerCase(),
            status: 'pending',
            expiresAt: { $gt: new Date() },
            $or: [
                { school: { $exists: false } }, // For supplier invitations, school won't exist
                { supplier: supplierId }
            ]
        });

        if (existingInvitation) {
            return res.status(400).json({ message: 'Une invitation est déjà en attente pour cette adresse email' });
        }

        // Create invitation record (we'll extend ManagerInvitation to support suppliers)
        // For now, store in supplier model
        if (!supplier.invitations) {
            supplier.invitations = [];
        }
        supplier.invitations.push({
            email: email.toLowerCase(),
            token: invitationToken,
            role,
            invitedBy: token.sub,
            expiresAt,
            createdAt: new Date()
        });
        await supplier.save();

        res.status(200).json({
            message: 'Invitation envoyée avec succès',
            invitationUrl // For testing purposes
        });
    } catch (error) {
        console.error('Error inviting supplier manager:', error);
        res.status(500).json({
            message: 'Erreur lors de l\'envoi de l\'invitation',
            error: error.message
        });
    }
}

