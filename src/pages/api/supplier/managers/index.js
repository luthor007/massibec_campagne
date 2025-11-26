import dbConnect from '../../../../lib/mongodb';
import SupplierManager from '../../../../models/SupplierManager';
import User from '../../../../models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        // Get supplier for this user
        const currentUserManager = await SupplierManager.findOne({
            user: token.sub,
            status: 'active'
        }).populate('supplier');

        if (!currentUserManager || !currentUserManager.supplier) {
            return res.status(404).json({ message: 'Fournisseur non trouvé' });
        }

        const supplierId = currentUserManager.supplier._id;

        // Get all managers for this supplier
        const managers = await SupplierManager.find({
            supplier: supplierId,
            status: 'active'
        })
            .populate('user', 'name email')
            .populate('invitedBy', 'name email')
            .sort({ role: 1, joinedAt: -1 })
            .lean();

        // Format response
        const formattedManagers = managers.map(manager => ({
            id: manager._id.toString(),
            userId: manager.user._id.toString(),
            name: manager.user.name,
            email: manager.user.email,
            role: manager.role,
            joinedAt: manager.joinedAt,
            isCurrentUser: manager.user._id.toString() === token.sub
        }));

        res.status(200).json({
            managers: formattedManagers,
            currentUserRole: currentUserManager.role
        });
    } catch (error) {
        console.error('Error fetching supplier managers:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des gestionnaires',
            error: error.message
        });
    }
}



