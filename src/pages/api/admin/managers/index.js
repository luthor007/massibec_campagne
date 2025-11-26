import dbConnect from '@/lib/mongodb';
import { checkAdminAccess } from '@/lib/adminAuth';
import AdminManager from '@/models/AdminManager';
import User from '@/models/User';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await dbConnect();

        // Check admin access
        const { authorized, message } = await checkAdminAccess(req);
        if (!authorized) {
            return res.status(403).json({ message });
        }

        // Get all admin managers
        const adminManagers = await AdminManager.find({ status: 'active' })
            .populate('user', 'name email')
            .populate('invitedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ adminManagers });
    } catch (error) {
        console.error('Error fetching admin managers:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des gestionnaires', error: error.message });
    }
}

