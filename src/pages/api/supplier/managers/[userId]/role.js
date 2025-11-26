import dbConnect from '../../../../../lib/mongodb';
import SupplierManager from '../../../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    const { userId } = req.query;

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        // Get current user's supplier manager record
        const currentUserManager = await SupplierManager.findOne({
            user: token.sub,
            status: 'active'
        }).populate('supplier');

        if (!currentUserManager || !currentUserManager.supplier) {
            return res.status(404).json({ message: 'Fournisseur non trouvé' });
        }

        // Only owner can change roles
        if (currentUserManager.role !== 'owner') {
            return res.status(403).json({ message: 'Seul le propriétaire peut modifier les rôles' });
        }

        const supplierId = currentUserManager.supplier._id;

        if (req.method === 'PATCH') {
            const { role } = req.body;

            if (!['owner', 'admin', 'member'].includes(role)) {
                return res.status(400).json({ message: 'Rôle invalide' });
            }

            // Cannot change your own role
            if (userId === token.sub) {
                return res.status(400).json({ message: 'Vous ne pouvez pas modifier votre propre rôle' });
            }

            const managerToUpdate = await SupplierManager.findOne({
                supplier: supplierId,
                user: userId,
                status: 'active'
            });

            if (!managerToUpdate) {
                return res.status(404).json({ message: 'Gestionnaire non trouvé' });
            }

            managerToUpdate.role = role;
            await managerToUpdate.save();

            res.status(200).json({
                message: 'Rôle modifié avec succès',
                manager: managerToUpdate
            });
        } else {
            res.setHeader('Allow', ['PATCH']);
            res.status(405).json({ message: 'Méthode non autorisée' });
        }
    } catch (error) {
        console.error('Error updating supplier manager role:', error);
        res.status(500).json({
            message: 'Erreur serveur',
            error: error.message
        });
    }
}

