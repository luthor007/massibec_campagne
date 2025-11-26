import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import Supplier from '../../../../models/Supplier';
import SupplierManager from '../../../../models/SupplierManager';
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

            const supplierId = supplierManager.supplier._id;

            // Get all products for this supplier
            const products = await Product.find({ supplier: supplierId })
                .sort({ order: 1, createdAt: -1 })
                .lean();

            // Get all bundles for this supplier
            const Bundle = (await import('../../../../models/Bundle')).default;
            const bundles = await Bundle.find({ supplier: supplierId })
                .populate('includedProducts.product')
                .sort({ order: 1, createdAt: -1 })
                .lean();

            // Combine products and bundles, marking bundles with isBundle flag
            const allItems = [
                ...products.map(p => ({ ...p, isBundle: false })),
                ...bundles.map(b => ({ ...b, isBundle: true }))
            ].sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                if (orderA !== orderB) return orderA - orderB;
                // If same order, sort by creation date for stability (older items first)
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                if (dateA !== dateB) return dateA - dateB;
                // If same date, sort by _id for absolute stability
                return (a._id || '').toString().localeCompare((b._id || '').toString());
            });

            // Auto-reorder to ensure sequential orders (0, 1, 2, ...)
            // Check if there are duplicates or gaps in the order sequence
            const orderCounts = {};
            const orders = new Set();
            allItems.forEach(item => {
                const order = item.order || 0;
                orderCounts[order] = (orderCounts[order] || 0) + 1;
                orders.add(order);
            });

            const hasDuplicates = Object.values(orderCounts).some(count => count > 1);
            // Check for gaps: if we have items but not sequential orders (e.g., 0, 1, 1, 1, 9 instead of 0, 1, 2, 3, 4)
            const maxOrder = allItems.length > 0 ? Math.max(...allItems.map(i => i.order || 0)) : -1;
            const uniqueOrders = Array.from(orders).sort((a, b) => a - b);
            // Check if orders are not sequential (should be 0, 1, 2, 3... but might be 0, 1, 1, 1, 9)
            const isSequential = uniqueOrders.every((order, index) => order === index);
            const needsReordering = hasDuplicates || !isSequential || maxOrder >= allItems.length;

            if (needsReordering) {
                console.log(`[Auto-reorder] Detected ${hasDuplicates ? 'duplicate orders' : 'gaps in order sequence'} for supplier ${supplierId}, reorganizing...`);
                console.log(`[Auto-reorder] Current orders:`, Array.from(orders).sort((a, b) => a - b));
                console.log(`[Auto-reorder] Total items: ${allItems.length}, Unique orders: ${orders.size}`);

                // Reassign sequential orders (0, 1, 2, ...) based on current sorted order
                // The items are already sorted correctly, so we just need to assign sequential orders
                const mongoose = (await import('mongoose')).default;
                const db = mongoose.connection.db;

                const updates = [];
                for (let i = 0; i < allItems.length; i++) {
                    const item = allItems[i];
                    const newOrder = i;
                    const currentOrder = item.order || 0;

                    // Always update to ensure sequential order
                    // This ensures that even if currentOrder === newOrder, we still update if there were duplicates
                    if (item.isBundle) {
                        updates.push(
                            db.collection('bundles').updateOne(
                                { _id: new mongoose.Types.ObjectId(item._id) },
                                { $set: { order: newOrder } }
                            )
                        );
                    } else {
                        updates.push(
                            db.collection('products').updateOne(
                                { _id: new mongoose.Types.ObjectId(item._id) },
                                { $set: { order: newOrder } }
                            )
                        );
                    }
                    // Update the item in our array for consistency
                    item.order = newOrder;
                }

                // Execute all updates in parallel
                if (updates.length > 0) {
                    await Promise.all(updates);
                    console.log(`[Auto-reorder] Reorganized ${allItems.length} items with sequential orders (0-${allItems.length - 1})`);
                }
            }

            // Get supplier settings for delivery configuration
            const supplier = await Supplier.findById(supplierId).lean();
            const deliverySettings = supplier?.deliverySettings || {
                pickupInstructions: '',
                directToConsumerEnabled: false,
                directToConsumerFee: 0,
                directToConsumerRegion: ''
            };

            // Get supplier address for delivery cost calculation
            const supplierAddress = supplier?.address || '';
            const pricingSettings = supplier?.pricingSettings || { markup: 5, handlesShipping: false };

            res.status(200).json({ products: allItems, deliverySettings, supplierAddress, pricingSettings });
        } catch (error) {
            console.error('Error fetching supplier products:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
        }
    } else if (req.method === 'POST') {
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

            // Check permissions (only owner and admin can create products)
            if (!['owner', 'admin'].includes(supplierManager.role)) {
                return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à créer des produits' });
            }

            const supplierId = supplierManager.supplier._id;
            const { name, description, pricePickup, recommendedRetailPrice, deliveryCostToSchool, directToConsumerEnabled, image, ingredientsImage, nutritionImage, productId, attributes, unitSize, casePack, pallet, refrigerated, packagingGroup } = req.body;

            // Get supplier settings for directToConsumerEnabled and pricing
            const supplier = await Supplier.findById(supplierId).lean();
            const supplierDirectToConsumerEnabled = supplier?.deliverySettings?.directToConsumerEnabled || false;
            const pricingSettings = supplier?.pricingSettings || { markup: 5, handlesShipping: false };
            const markupMultiplier = 1 + (pricingSettings.markup / 100);

            // Validate required fields
            if (!name || !description || !pricePickup || !image) {
                return res.status(400).json({
                    message: 'Tous les champs requis doivent être remplis: nom, description, prix pickup et image'
                });
            }

            // Generate productId if not provided
            let finalProductId = productId;
            if (!finalProductId) {
                // Use supplier slug or supplier ID to ensure uniqueness
                const supplierSlug = supplierManager.supplier.slug?.toUpperCase() || supplierId.toString().slice(-6).toUpperCase();
                const count = await Product.countDocuments({ supplier: supplierId });

                // Generate base productId
                finalProductId = `PROD-${supplierSlug}-${String(count + 1).padStart(4, '0')}`;

                // Ensure uniqueness by checking globally (productId is globally unique)
                let attempts = 0;
                let existingProduct = await Product.findOne({ productId: finalProductId });
                while (existingProduct && attempts < 100) {
                    attempts++;
                    // Try incrementing the count
                    finalProductId = `PROD-${supplierSlug}-${String(count + 1 + attempts).padStart(4, '0')}`;
                    existingProduct = await Product.findOne({ productId: finalProductId });
                }

                // If still not unique after 100 attempts, use timestamp-based ID
                if (existingProduct) {
                    finalProductId = `PROD-${supplierSlug}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                }
            } else {
                // If productId is provided, check if it already exists globally
                const existingProduct = await Product.findOne({ productId: finalProductId });
                if (existingProduct) {
                    return res.status(400).json({ message: 'Cet ID de produit existe déjà' });
                }
            }

            // Calculate price from pricePickup (pricePickup * markup + deliveryCostToSchool if supplier doesn't handle shipping)
            const pricePickupValue = parseFloat(pricePickup);
            const deliveryCostToSchoolValue = parseFloat(deliveryCostToSchool) || 0;
            // If supplier handles shipping, delivery cost should be 0 for price calculation
            const handlesShipping = pricingSettings.handlesShipping || false;
            const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCostToSchoolValue;
            const basePrice = pricePickupValue * markupMultiplier; // Dynamic markup from supplier settings
            const totalPrice = basePrice + effectiveDeliveryCost;
            // Round down to nearest 5 cents
            const calculatedPrice = Math.floor(totalPrice * 20) / 20;

            const product = new Product({
                name,
                description,
                pricePickup: pricePickupValue,
                price: calculatedPrice, // Prix de vente à l'école (calculé automatiquement: pricePickup * markup + deliveryCostToSchool)
                recommendedRetailPrice: recommendedRetailPrice ? parseFloat(recommendedRetailPrice) : undefined,
                deliveryCostToSchool: deliveryCostToSchoolValue,
                directToConsumerEnabled: supplierDirectToConsumerEnabled && (directToConsumerEnabled === true || directToConsumerEnabled === 'true'),
                image,
                ingredientsImage: ingredientsImage || '',
                nutritionImage: nutritionImage || '',
                productId: finalProductId,
                supplier: supplierId,
                attributes: attributes || {},
                unitSize: unitSize || '',
                casePack: casePack || '',
                pallet: pallet || { ti: 0, hi: 0 },
                refrigerated: refrigerated || false,
                packagingGroup: packagingGroup || ''
            });

            await product.save();

            res.status(201).json({ product });
        } catch (error) {
            console.error('Error creating product:', error);
            res.status(500).json({ message: 'Erreur lors de la création du produit', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ message: 'Méthode non autorisée' });
    }
}


