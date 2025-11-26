// Admin endpoint to delete a supplier and all associated data by email
// Usage: POST /api/admin/delete-supplier-by-email with body: { email: "supplier@example.com" }

import dbConnect from '../../../lib/mongodb';
import Supplier from '../../../models/Supplier';
import User from '../../../models/User';
import SupplierManager from '../../../models/SupplierManager';
import Campaign from '../../../models/Campaign';
import Order from '../../../models/Order';

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

        const sanitizedEmail = email.toLowerCase().trim();

        // Find the supplier by email
        const supplier = await Supplier.findOne({ email: sanitizedEmail });
        if (!supplier) {
            return res.status(404).json({ message: `Supplier avec l'email ${sanitizedEmail} non trouvé` });
        }

        console.log(`📋 Found supplier: ${supplier.name} (${supplier.email})`);
        const supplierId = supplier._id;

        // Track what we're deleting
        const deletionSummary = {
            supplier: 0,
            users: 0,
            supplierManagers: 0,
            campaigns: 0,
            orders: 0,
        };

        // 1. Find all users associated with this supplier
        const supplierManagers = await SupplierManager.find({ supplier: supplierId });
        deletionSummary.supplierManagers = supplierManagers.length;

        const userIds = supplierManagers.map(sm => sm.user);

        // 2. Delete campaigns associated with this supplier
        const campaignsResult = await Campaign.deleteMany({ supplier: supplierId });
        deletionSummary.campaigns = campaignsResult.deletedCount;

        // 3. Delete orders associated with campaigns from this supplier
        const campaignIds = await Campaign.find({ supplier: supplierId }).distinct('_id');
        if (campaignIds.length > 0) {
            const ordersResult = await Order.deleteMany({ campaignId: { $in: campaignIds } });
            deletionSummary.orders = ordersResult.deletedCount;
        }

        // 4. Delete supplier manager entries
        await SupplierManager.deleteMany({ supplier: supplierId });

        // 5. Delete users associated with this supplier
        for (const userId of userIds) {
            await User.findByIdAndDelete(userId);
            deletionSummary.users++;
        }

        // 6. Delete the supplier itself
        await Supplier.findByIdAndDelete(supplierId);
        deletionSummary.supplier = 1;

        res.status(200).json({
            message: 'Supplier et toutes les données associées supprimés avec succès',
            summary: deletionSummary
        });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({
            message: 'Erreur lors de la suppression',
            error: error.message
        });
    }
}


