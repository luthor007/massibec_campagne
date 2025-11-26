import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import Bundle from '../../../../models/Bundle';
import SupplierManager from '../../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'PATCH') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || (token.role !== 'supplier' && token.role !== 'fournisseur')) {
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

        const supplierId = supplierManager.supplier._id;

        // Get supplier pricing settings
        const Supplier = (await import('../../../../models/Supplier')).default;
        const supplier = await Supplier.findById(supplierId).lean();
        const pricingSettings = supplier?.pricingSettings || { markup: 5, handlesShipping: false };
        const markupMultiplier = 1 + (pricingSettings.markup / 100);

        const { productId, field, value, isBundle } = req.body;

        if (!productId || !field) {
            return res.status(400).json({ message: 'productId et field sont requis' });
        }

        // Try to find as product first, then as bundle
        let item = await Product.findById(productId);
        let itemType = 'product';

        if (!item) {
            item = await Bundle.findById(productId);
            itemType = 'bundle';
        }

        if (!item) {
            return res.status(404).json({ message: 'Produit ou bundle non trouvé' });
        }

        // Debug log
        console.log(`[Update Field] Updating ${itemType} ${productId}, field: ${field}, value:`, value);

        // Verify item belongs to this supplier
        if (item.supplier.toString() !== supplierId.toString()) {
            return res.status(403).json({ message: 'Ce produit/bundle ne vous appartient pas' });
        }

        // Allowed fields for inline editing
        const allowedFields = ['name', 'description', 'pricePickup', 'recommendedRetailPrice', 'productId'];

        // For bundles, only allow certain fields (not productId)
        const bundleAllowedFields = ['name', 'description', 'pricePickup', 'recommendedRetailPrice'];
        const fieldsToCheck = itemType === 'bundle' ? bundleAllowedFields : allowedFields;

        if (!fieldsToCheck.includes(field)) {
            return res.status(400).json({ message: `Le champ ${field} ne peut pas être modifié en ligne${itemType === 'bundle' ? ' pour un bundle' : ''}` });
        }

        // Prepare update object
        let updateData = {};

        if (field === 'pricePickup') {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
                return res.status(400).json({ message: 'Le prix doit être un nombre positif' });
            }
            updateData.pricePickup = numValue;

            // For bundles, recalculate price after pricePickup change
            if (itemType === 'bundle') {
                // Calculate new price: pricePickup * markup + deliveryCostToSchool (if supplier doesn't handle shipping)
                const deliveryCost = item.deliveryCostToSchool || 0;
                // If supplier handles shipping, delivery cost should be 0 for price calculation
                const handlesShipping = pricingSettings.handlesShipping || false;
                const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCost;
                const basePrice = numValue * markupMultiplier;
                const totalPrice = basePrice + effectiveDeliveryCost;
                // Round down to nearest 5 cents
                updateData.price = Math.floor(totalPrice * 20) / 20;
            }
        } else if (field === 'recommendedRetailPrice') {
            if (value === '' || value === null || value === undefined) {
                // Use $unset to remove the field completely for optional fields
                if (itemType === 'bundle') {
                    await Bundle.updateOne({ _id: productId }, { $unset: { recommendedRetailPrice: '' } });
                } else {
                    await Product.updateOne({ _id: productId }, { $unset: { recommendedRetailPrice: '' } });
                }
                // Fetch the updated item
                const updatedItem = itemType === 'bundle'
                    ? await Bundle.findById(productId)
                    : await Product.findById(productId);
                console.log(`[Update Field] Removed recommendedRetailPrice from ${itemType}`);
                return res.status(200).json({ message: 'Champ mis à jour avec succès', product: updatedItem, itemType });
            } else {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < 0) {
                    return res.status(400).json({ message: 'Le prix de revente doit être un nombre positif' });
                }
                updateData.recommendedRetailPrice = numValue;
                console.log(`[Update Field] Setting recommendedRetailPrice to:`, numValue);
            }
        } else {
            updateData[field] = value;
        }

        // Use direct MongoDB update to bypass Mongoose hooks and ensure persistence
        console.log(`[Update Field] updateData:`, JSON.stringify(updateData));

        // For bundles, we need to handle price recalculation if pricePickup changed
        if (itemType === 'bundle' && updateData.pricePickup) {
            // Get deliveryCost from the item
            const deliveryCost = item.deliveryCostToSchool || 0;
            // If supplier handles shipping, delivery cost should be 0 for price calculation
            const handlesShipping = pricingSettings.handlesShipping || false;
            const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCost;
            const basePrice = updateData.pricePickup * markupMultiplier;
            const totalPrice = basePrice + effectiveDeliveryCost;
            // Round down to nearest 5 cents
            updateData.price = Math.floor(totalPrice * 20) / 20;
        }

        // Use direct MongoDB update to bypass Mongoose completely
        const mongoose = (await import('mongoose')).default;
        const db = mongoose.connection.db;
        const collectionName = itemType === 'bundle' ? 'bundles' : 'products';

        const updateResult = await db.collection(collectionName).updateOne(
            { _id: new mongoose.Types.ObjectId(productId) },
            { $set: updateData }
        );

        console.log(`[Update Field] Direct MongoDB update result:`, updateResult);
        console.log(`[Update Field] Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`);

        // Fetch fresh from DB to confirm
        const freshItem = itemType === 'bundle'
            ? await Bundle.findById(productId).lean()
            : await Product.findById(productId).lean();

        console.log(`[Update Field] Fresh from DB - recommendedRetailPrice:`, freshItem.recommendedRetailPrice);

        // Convert to plain object for response
        const itemObj = freshItem;

        res.status(200).json({ message: 'Champ mis à jour avec succès', product: itemObj, itemType });
    } catch (error) {
        console.error('Error updating product/bundle field:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
    }
}

