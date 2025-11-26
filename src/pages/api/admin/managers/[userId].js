import dbConnect from '@/lib/mongodb';
import { checkAdminAccess } from '@/lib/adminAuth';
import AdminManager from '@/models/AdminManager';
import User from '@/models/User';

export default async function handler(req, res) {
    try {
        await dbConnect();

        // Check admin access
        const { authorized, message, user: currentUser } = await checkAdminAccess(req);
        if (!authorized) {
            return res.status(403).json({ message });
        }

        const { userId } = req.query;

        // Only primary admin or admin managers with 'admin' role can manage
        const currentAdminManager = await AdminManager.findOne({
            user: currentUser._id,
            status: 'active'
        });

        const canManage = currentUser.email?.toLowerCase() === 'alexis.massicotte@icloud.com' ||
            (currentAdminManager && ['owner', 'admin'].includes(currentAdminManager.role));

        if (!canManage) {
            return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à gérer les gestionnaires' });
        }

        if (req.method === 'DELETE') {
            // Remove admin manager
            const adminManager = await AdminManager.findOne({
                user: userId,
                status: 'active'
            });

            if (!adminManager) {
                return res.status(404).json({ message: 'Gestionnaire non trouvé' });
            }

            // Don't allow removing yourself
            if (adminManager.user.toString() === currentUser._id.toString()) {
                return res.status(400).json({ message: 'Vous ne pouvez pas vous retirer vous-même' });
            }

            adminManager.status = 'removed';
            await adminManager.save();

            return res.status(200).json({ message: 'Gestionnaire retiré avec succès' });
        }

        if (req.method === 'PATCH') {
            // Update role
            const { role } = req.body;

            if (!role || !['admin', 'member'].includes(role)) {
                return res.status(400).json({ message: 'Rôle invalide' });
            }

            const adminManager = await AdminManager.findOne({
                user: userId,
                status: 'active'
            });

            if (!adminManager) {
                return res.status(404).json({ message: 'Gestionnaire non trouvé' });
            }

            // Don't allow changing your own role
            if (adminManager.user.toString() === currentUser._id.toString()) {
                return res.status(400).json({ message: 'Vous ne pouvez pas modifier votre propre rôle' });
            }

            adminManager.role = role;
            await adminManager.save();

            return res.status(200).json({ message: 'Rôle mis à jour avec succès', adminManager });
        }

        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        console.error('Error managing admin manager:', error);
        res.status(500).json({ message: 'Erreur lors de la gestion du gestionnaire', error: error.message });
    }
}

