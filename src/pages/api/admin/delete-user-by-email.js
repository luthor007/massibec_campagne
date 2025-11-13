// Admin endpoint to delete a user and all associated data by email
// Usage: POST /api/admin/delete-user-by-email with body: { email: "user@example.com" }

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import School from '../../../models/School';
import Store from '../../../models/Store';
import Order from '../../../models/Order';
import OrderStudent from '../../../models/OrderStudent';
import Campaign from '../../../models/Campaign';
import SchoolManager from '../../../models/SchoolManager';
import SupplierManager from '../../../models/SupplierManager';
import Conversation from '../../../models/Conversation';
import Message from '../../../models/Message';
import Review from '../../../models/Review';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    // Security: Only allow in development or with admin secret
    const adminSecret = req.headers['x-admin-secret'] || req.body.adminSecret;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isDevelopment && adminSecret !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: 'Non autorisé' });
    }

    try {
        await dbConnect();

        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email requis' });
        }

        // Find the user
        let user = await User.findOne({ email });
        
        // If user not found, check if there's a supplier with this email
        if (!user) {
            const Supplier = (await import('../../../models/Supplier')).default;
            const supplier = await Supplier.findOne({ email });
            
            if (supplier) {
                // Delete supplier and associated data
                const supplierId = supplier._id;
                const supplierManagers = await SupplierManager.find({ supplier: supplierId });
                const userIds = supplierManagers.map(sm => sm.user);
                
                // Delete campaigns
                await Campaign.deleteMany({ supplier: supplierId });
                
                // Delete supplier managers
                await SupplierManager.deleteMany({ supplier: supplierId });
                
                // Delete users
                for (const userId of userIds) {
                    await User.findByIdAndDelete(userId);
                }
                
                // Delete supplier
                await Supplier.findByIdAndDelete(supplierId);
                
                return res.status(200).json({
                    message: 'Supplier et toutes les données associées supprimés avec succès',
                    summary: {
                        supplier: 1,
                        users: userIds.length,
                        supplierManagers: supplierManagers.length
                    }
                });
            }
            
            return res.status(404).json({ message: `Utilisateur ou supplier avec l'email ${email} non trouvé` });
        }

        console.log(`📋 Found user: ${user.name} (${user.email}) - Role: ${user.role}`);
        const userId = user._id;

        // Track what we're deleting
        const deletionSummary = {
            user: 0,
            suppliers: 0,
            orders: 0,
            orderStudents: 0,
            stores: 0,
            campaigns: 0,
            schools: 0,
            schoolManagers: 0,
            supplierManagers: 0,
            conversations: 0,
            messages: 0,
            reviews: 0,
        };

        // 1. Delete all orders
        const ordersResult = await Order.deleteMany({ user: userId });
        deletionSummary.orders = ordersResult.deletedCount;

        // 2. Delete all order students
        const orderStudentsResult = await OrderStudent.deleteMany({ user: userId });
        deletionSummary.orderStudents = orderStudentsResult.deletedCount;

        // 3. Delete all stores
        const storesResult = await Store.deleteMany({ user: userId });
        deletionSummary.stores = storesResult.deletedCount;

        // 4. Delete conversations and messages
        const conversations = await Conversation.find({
            $or: [
                { school: userId },
                { supplier: userId }
            ]
        });

        for (const conv of conversations) {
            // Delete all messages in this conversation
            const messagesResult = await Message.deleteMany({ conversation: conv._id });
            deletionSummary.messages += messagesResult.deletedCount;

            // Delete the conversation
            await Conversation.findByIdAndDelete(conv._id);
            deletionSummary.conversations++;
        }

        // 5. Delete reviews
        const reviewsResult = await Review.deleteMany({
            $or: [
                { school: userId },
                { supplier: userId }
            ]
        });
        deletionSummary.reviews = reviewsResult.deletedCount;

        // 6. Handle school manager
        if (user.role === 'school_manager') {
            const schoolManagers = await SchoolManager.find({ user: userId });
            deletionSummary.schoolManagers = schoolManagers.length;

            // Get all schools managed by this user
            const schoolIds = schoolManagers.map(sm => sm.school);

            // Delete school manager entries
            await SchoolManager.deleteMany({ user: userId });

            // Delete campaigns associated with these schools
            const campaignsResult = await Campaign.deleteMany({ school: { $in: schoolIds } });
            deletionSummary.campaigns = campaignsResult.deletedCount;

            // Delete schools (only if no other managers)
            for (const schoolId of schoolIds) {
                const otherManagers = await SchoolManager.find({
                    school: schoolId,
                    user: { $ne: userId }
                });

                if (otherManagers.length === 0) {
                    // No other managers, safe to delete school
                    await School.findByIdAndDelete(schoolId);
                    deletionSummary.schools++;
                }
            }
        }

        // 7. Handle supplier manager
        if (user.role === 'supplier') {
            const supplierManagers = await SupplierManager.find({ user: userId });
            deletionSummary.supplierManagers = supplierManagers.length;

            // Get supplier ID
            const supplierId = supplierManagers[0]?.supplier;

            if (supplierId) {
                // Delete campaigns associated with this supplier
                const campaignsResult = await Campaign.deleteMany({ supplier: supplierId });
                deletionSummary.campaigns = campaignsResult.deletedCount;

                // Import Supplier model
                const Supplier = (await import('../../../models/Supplier')).default;
                
                // Delete the supplier itself
                await Supplier.findByIdAndDelete(supplierId);
                deletionSummary.suppliers = 1;
            }

            // Delete supplier manager entries
            await SupplierManager.deleteMany({ user: userId });
        }

        // 8. Delete the user
        await User.findByIdAndDelete(userId);
        deletionSummary.user = 1;

        res.status(200).json({
            message: 'Utilisateur et toutes les données associées supprimés avec succès',
            summary: deletionSummary
        });
    } catch (error) {
        res.status(500).json({
            message: 'Erreur lors de la suppression',
            error: error.message
        });
    }
}

