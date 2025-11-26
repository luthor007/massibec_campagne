// Admin authentication helper
import { getToken } from 'next-auth/jwt';
import dbConnect from './mongodb';
import User from '@/models/User';
import AdminManager from '@/models/AdminManager';

const PRIMARY_ADMIN_EMAIL = 'alexis.massicotte@icloud.com';

/**
 * Check if the current user is an admin
 * @param {Object} req - Next.js request object
 * @returns {Promise<{authorized: boolean, user?: Object, message?: string}>}
 */
export async function checkAdminAccess(req) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return { authorized: false, message: 'Not authenticated' };
        }

        await dbConnect();
        const user = await User.findById(token.sub);

        if (!user) {
            return { authorized: false, message: 'User not found' };
        }

        // Check if user is the primary admin
        if (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
            return { authorized: true, user, isPrimaryAdmin: true };
        }

        // Check if user is an admin manager
        const adminManager = await AdminManager.findOne({
            user: user._id,
            status: 'active'
        });

        if (adminManager) {
            return { authorized: true, user, isPrimaryAdmin: false, adminManager };
        }

        return { authorized: false, message: 'Admin access required' };
    } catch (error) {
        console.error('Error checking admin access:', error);
        return { authorized: false, message: 'Error checking access' };
    }
}

/**
 * Middleware for API routes that require admin access
 * Usage: export default withAdminAuth(handler)
 */
export function withAdminAuth(handler) {
    return async (req, res) => {
        const { authorized, message } = await checkAdminAccess(req);

        if (!authorized) {
            return res.status(403).json({ message });
        }

        return handler(req, res);
    };
}

