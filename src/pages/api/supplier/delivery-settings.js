// src/pages/api/supplier/delivery-settings.js
import dbConnect from '../../../lib/mongodb';
import Supplier from '../../../models/Supplier';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            await dbConnect();

            const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
            if (!token || token.role !== 'supplier') {
                return res.status(401).json({ message: 'Non autorisé' });
            }

            // Get supplier for this user
            const supplierManager = await SupplierManager.findOne({
                user: token.sub,
                status: 'active'
            }).populate('supplier');

            if (!supplierManager || !supplierManager.supplier) {
                return res.status(404).json({ message: 'Fournisseur non trouvé' });
            }

            const supplier = await Supplier.findById(supplierManager.supplier._id).lean();
            // Ensure all fields are present, even if they're undefined in the database
            const deliverySettings = {
                pickupInstructions: supplier?.deliverySettings?.pickupInstructions || '',
                directToConsumerEnabled: supplier?.deliverySettings?.directToConsumerEnabled || false,
                directToConsumerFee: supplier?.deliverySettings?.directToConsumerFee || 0,
                directToConsumerRegion: supplier?.deliverySettings?.directToConsumerRegion || '',
                minimumDeliveryDays: supplier?.deliverySettings?.minimumDeliveryDays || 21
            };

            console.log('[Delivery Settings API] Fetching settings:', deliverySettings);

            res.status(200).json({ deliverySettings });
        } catch (error) {
            console.error('Error fetching delivery settings:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des paramètres' });
        }
    } else if (req.method === 'PUT') {
        try {
            await dbConnect();

            const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
            if (!token || token.role !== 'supplier') {
                return res.status(401).json({ message: 'Non autorisé' });
            }

            // Get supplier for this user
            const supplierManager = await SupplierManager.findOne({
                user: token.sub,
                status: 'active'
            }).populate('supplier');

            if (!supplierManager || !supplierManager.supplier) {
                return res.status(404).json({ message: 'Fournisseur non trouvé' });
            }

            // Check permissions (only owner and admin can update settings)
            if (!['owner', 'admin'].includes(supplierManager.role)) {
                return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier les paramètres' });
            }

            const supplierId = supplierManager.supplier._id;
            // Extract from req.body - handle both direct properties and nested deliverySettings object
            const {
                pickupInstructions,
                directToConsumerEnabled,
                directToConsumerFee,
                directToConsumerRegion,
                minimumDeliveryDays
            } = req.body;

            console.log('[Delivery Settings API] Received data:', {
                pickupInstructions,
                directToConsumerEnabled,
                directToConsumerFee,
                directToConsumerRegion,
                fullBody: req.body
            });

            // Validate required fields if direct to consumer is enabled
            if (directToConsumerEnabled === true || directToConsumerEnabled === 'true') {
                if (!directToConsumerFee || parseFloat(directToConsumerFee) <= 0) {
                    return res.status(400).json({ message: 'Le prix fixe par commande est requis lorsque la livraison directe au consommateur est activée' });
                }
                if (!directToConsumerRegion || directToConsumerRegion.trim() === '') {
                    return res.status(400).json({ message: 'La région couverte est requise lorsque la livraison directe au consommateur est activée' });
                }
            }

            // Update delivery settings
            const supplier = await Supplier.findById(supplierId);
            if (!supplier) {
                return res.status(404).json({ message: 'Fournisseur non trouvé' });
            }

            // Preserve existing deliverySettings if it exists, then update with new values
            const updatedDeliverySettings = {
                pickupInstructions: (pickupInstructions !== undefined && pickupInstructions !== null) ? String(pickupInstructions) : (supplier.deliverySettings?.pickupInstructions || ''),
                directToConsumerEnabled: directToConsumerEnabled === true || directToConsumerEnabled === 'true',
                directToConsumerFee: directToConsumerFee !== undefined ? parseFloat(directToConsumerFee) || 0 : (supplier.deliverySettings?.directToConsumerFee || 0),
                directToConsumerRegion: (directToConsumerRegion !== undefined && directToConsumerRegion !== null) ? String(directToConsumerRegion) : (supplier.deliverySettings?.directToConsumerRegion || ''),
                minimumDeliveryDays: minimumDeliveryDays !== undefined ? parseInt(minimumDeliveryDays) || 21 : (supplier.deliverySettings?.minimumDeliveryDays || 21)
            };

            console.log('[Delivery Settings API] Saving:', updatedDeliverySettings);

            // Use direct MongoDB update to ensure nested object is saved
            // Mongoose sometimes has issues with nested objects, so we use the native driver
            const mongoose = (await import('mongoose')).default;
            const db = mongoose.connection.db;

            const updateResult = await db.collection('suppliers').updateOne(
                { _id: new mongoose.Types.ObjectId(supplierId) },
                { $set: { deliverySettings: updatedDeliverySettings } }
            );

            console.log('[Delivery Settings API] Update result:', {
                matchedCount: updateResult.matchedCount,
                modifiedCount: updateResult.modifiedCount
            });

            // Wait a bit to ensure MongoDB has written the changes
            await new Promise(resolve => setTimeout(resolve, 100));

            // Fetch the updated supplier to verify using direct MongoDB query
            const updatedSupplierDoc = await db.collection('suppliers').findOne(
                { _id: new mongoose.Types.ObjectId(supplierId) }
            );

            if (!updatedSupplierDoc) {
                return res.status(404).json({ message: 'Fournisseur non trouvé après la mise à jour' });
            }

            console.log('[Delivery Settings API] Updated supplier deliverySettings from DB:', updatedSupplierDoc.deliverySettings);

            // Use the saved data from DB, or fallback to what we tried to save
            const savedDeliverySettings = updatedSupplierDoc.deliverySettings || updatedDeliverySettings;

            res.status(200).json({
                message: 'Paramètres de livraison mis à jour avec succès',
                deliverySettings: {
                    pickupInstructions: savedDeliverySettings?.pickupInstructions || '',
                    directToConsumerEnabled: savedDeliverySettings?.directToConsumerEnabled || false,
                    directToConsumerFee: savedDeliverySettings?.directToConsumerFee || 0,
                    directToConsumerRegion: savedDeliverySettings?.directToConsumerRegion || '',
                    minimumDeliveryDays: savedDeliverySettings?.minimumDeliveryDays || 21
                }
            });
        } catch (error) {
            console.error('Error updating delivery settings:', error);
            res.status(500).json({ message: 'Erreur lors de la mise à jour des paramètres', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).json({ message: 'Méthode non autorisée' });
    }
}

