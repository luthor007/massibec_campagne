import dbConnect from '../../../../lib/mongodb';
import SupplierManager from '../../../../models/SupplierManager';
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

        const supplierId = currentUserManager.supplier._id;

        if (req.method === 'DELETE') {
            // Only owner can remove managers
            if (currentUserManager.role !== 'owner') {
                return res.status(403).json({ message: 'Seul le propriétaire peut supprimer des gestionnaires' });
            }

            // Cannot remove yourself
            if (userId === token.sub) {
                return res.status(400).json({ message: 'Vous ne pouvez pas vous supprimer vous-même' });
            }

            const managerToRemove = await SupplierManager.findOne({
                supplier: supplierId,
                user: userId,
                status: 'active'
            });

            if (!managerToRemove) {
                return res.status(404).json({ message: 'Gestionnaire non trouvé' });
            }

            // Soft delete - set status to 'removed'
            managerToRemove.status = 'removed';
            await managerToRemove.save();

            res.status(200).json({ message: 'Gestionnaire supprimé avec succès' });
        } else {
            res.setHeader('Allow', ['DELETE']);
            res.status(405).json({ message: 'Méthode non autorisée' });
        }
    } catch (error) {
        console.error('Error in supplier manager API:', error);
        res.status(500).json({
            message: 'Erreur serveur',
            error: error.message
        });
    }
}

