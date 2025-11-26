import dbConnect from '../../../../lib/mongodb';
import { getToken } from 'next-auth/jwt';
import Product from '../../../../models/Product';
import SupplierManager from '../../../../models/SupplierManager';

export default async function handler(req, res) {
    if (req.method === 'PUT') {
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

            // Check permissions (only owner and admin can bulk update)
            if (!['owner', 'admin'].includes(supplierManager.role)) {
                return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier des produits en masse' });
            }

            const { productIds, pricePickup, recommendedRetailPrice, deliveryCostToSchool, refrigerated, packagingGroup, unitSize, casePack, pallet, attributes } = req.body;

            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                return res.status(400).json({ message: 'Liste de produits requise' });
            }

            const supplierId = supplierManager.supplier._id;

            // Get supplier pricing settings
            const Supplier = (await import('../../../../models/Supplier')).default;
            const supplier = await Supplier.findById(supplierId).lean();
            const pricingSettings = supplier?.pricingSettings || { markup: 5, handlesShipping: false };
            const markupMultiplier = 1 + (pricingSettings.markup / 100);

            // Verify all products belong to this supplier
            const products = await Product.find({
                _id: { $in: productIds },
                supplier: supplierId
            });

            if (products.length !== productIds.length) {
                return res.status(400).json({ message: 'Certains produits ne sont pas valides ou ne vous appartiennent pas' });
            }

            // Build update object
            const updateData = {};

            if (pricePickup !== undefined) {
                const pricePickupValue = parseFloat(pricePickup);
                if (pricePickupValue < 0) {
                    return res.status(400).json({ message: 'Le prix doit être >= 0' });
                }
                updateData.pricePickup = pricePickupValue;
                // Recalculate price from pricePickup (pricePickup * markup + deliveryCostToSchool)
                const basePrice = pricePickupValue * markupMultiplier;

                // If deliveryCostToSchool is provided, use it for all products
                if (deliveryCostToSchool !== undefined) {
                    const deliveryCost = parseFloat(deliveryCostToSchool) || 0;
                    updateData.deliveryCostToSchool = deliveryCost;
                    // If supplier handles shipping, delivery cost should be 0 for price calculation
                    const handlesShipping = pricingSettings.handlesShipping || false;
                    const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCost;
                    const totalPrice = basePrice + effectiveDeliveryCost;
                    // Round down to nearest 5 cents
                    updateData.price = Math.floor(totalPrice * 20) / 20;
                } else {
                    // For bulk update, recalculate price for each product with its existing deliveryCostToSchool
                    const handlesShipping = pricingSettings.handlesShipping || false;
                    for (const product of products) {
                        const existingDeliveryCost = product.deliveryCostToSchool || 0;
                        // If supplier handles shipping, delivery cost should be 0 for price calculation
                        const effectiveDeliveryCost = handlesShipping ? 0 : existingDeliveryCost;
                        const totalPrice = basePrice + effectiveDeliveryCost;
                        // Round down to nearest 5 cents
                        const newPrice = Math.floor(totalPrice * 20) / 20;
                        await Product.updateOne(
                            { _id: product._id },
                            {
                                $set: {
                                    pricePickup: pricePickupValue,
                                    price: newPrice
                                }
                            }
                        );
                    }
                    // Remove pricePickup and price from bulk update since we handled it individually
                    delete updateData.pricePickup;
                    delete updateData.price;
                }
            }

            if (deliveryCostToSchool !== undefined && pricePickup === undefined) {
                // Only update deliveryCostToSchool if pricePickup is not being updated
                const deliveryCost = parseFloat(deliveryCostToSchool) || 0;
                updateData.deliveryCostToSchool = deliveryCost;
                // Recalculate price for each product with its existing pricePickup
                // This will be handled by updating each product individually
                const handlesShipping = pricingSettings.handlesShipping || false;
                for (const product of products) {
                    if (product.pricePickup) {
                        const basePrice = product.pricePickup * markupMultiplier;
                        // If supplier handles shipping, delivery cost should be 0 for price calculation
                        const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCost;
                        const totalPrice = basePrice + effectiveDeliveryCost;
                        // Round down to nearest 5 cents
                        const roundedPrice = Math.floor(totalPrice * 20) / 20;
                        await Product.updateOne(
                            { _id: product._id },
                            {
                                $set: {
                                    deliveryCostToSchool: deliveryCost,
                                    price: roundedPrice
                                }
                            }
                        );
                    }
                }
                delete updateData.deliveryCostToSchool; // Remove from bulk update since we handled it individually
            }

            if (recommendedRetailPrice !== undefined) {
                const recommendedRetailPriceValue = parseFloat(recommendedRetailPrice);
                if (recommendedRetailPriceValue < 0) {
                    return res.status(400).json({ message: 'Le prix de revente doit être >= 0' });
                }
                updateData.recommendedRetailPrice = recommendedRetailPriceValue;
            }

            if (refrigerated !== undefined) {
                updateData.refrigerated = refrigerated;
            }

            if (packagingGroup !== undefined) {
                updateData.packagingGroup = packagingGroup;
            }

            if (unitSize !== undefined) {
                updateData.unitSize = unitSize;
            }

            if (casePack !== undefined) {
                updateData.casePack = casePack;
            }

            if (pallet !== undefined) {
                updateData.pallet = pallet;
            }

            if (attributes !== undefined) {
                // Merge attributes with existing ones
                for (const product of products) {
                    const existingAttributes = product.attributes || {};
                    const mergedAttributes = { ...existingAttributes, ...attributes };
                    await Product.updateOne(
                        { _id: product._id },
                        { $set: { attributes: mergedAttributes } }
                    );
                }
                // Remove attributes from updateData since we handle it separately
                delete updateData.attributes;
            }

            // Update all products
            if (Object.keys(updateData).length > 0) {
                await Product.updateMany(
                    { _id: { $in: productIds }, supplier: supplierId },
                    { $set: updateData }
                );
            }

            res.status(200).json({
                message: `${productIds.length} produit(s) mis à jour avec succès`,
                updated: productIds.length
            });
        } catch (error) {
            console.error('Error bulk updating products:', error);
            res.status(500).json({ message: 'Erreur lors de la mise à jour en masse', error: error.message });
        }
    } else if (req.method === 'DELETE') {
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

            // Check permissions (only owner and admin can bulk delete)
            if (!['owner', 'admin'].includes(supplierManager.role)) {
                return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer des produits en masse' });
            }

            const { productIds } = req.body;

            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                return res.status(400).json({ message: 'Liste de produits requise' });
            }

            const supplierId = supplierManager.supplier._id;

            // Verify all products belong to this supplier and delete them
            const result = await Product.deleteMany({
                _id: { $in: productIds },
                supplier: supplierId
            });

            res.status(200).json({
                message: `${result.deletedCount} produit(s) supprimé(s) avec succès`,
                deleted: result.deletedCount
            });
        } catch (error) {
            console.error('Error bulk deleting products:', error);
            res.status(500).json({ message: 'Erreur lors de la suppression en masse', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).json({ message: 'Méthode non autorisée' });
    }
}

