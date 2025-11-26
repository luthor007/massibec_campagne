import { checkAdminAccess } from '@/lib/adminAuth';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { authorized } = await checkAdminAccess(req);

        if (!authorized) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        res.status(200).json({ authorized: true });
    } catch (error) {
        console.error('Error checking admin access:', error);
        res.status(500).json({ message: 'Error checking access' });
    }
}

