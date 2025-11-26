import dbConnect from '../../../lib/mongodb';
import Bundle from '../../../models/Bundle';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method === 'POST') {
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
            const { name, description, pricePickup, recommendedRetailPrice, image, includedProducts } = req.body;

            // Debug: log received data
            console.log('[Bundle API] Received recommendedRetailPrice:', recommendedRetailPrice, 'Type:', typeof recommendedRetailPrice);

            if (!name || !pricePickup || !includedProducts || includedProducts.length === 0) {
                return res.status(400).json({ message: 'Nom, prix pickup et produits inclus sont requis' });
            }

            if (!image) {
                return res.status(400).json({ message: 'L\'image du bundle est requise' });
            }

            // Verify all products belong to this supplier
            const Product = (await import('../../../models/Product')).default;
            const productIds = includedProducts.map(ip => ip.product);
            const products = await Product.find({ _id: { $in: productIds } });

            const invalidProducts = products.filter(p => p.supplier.toString() !== supplierId.toString());
            if (invalidProducts.length > 0) {
                return res.status(400).json({ message: 'Certains produits ne vous appartiennent pas' });
            }

            // Validate and parse pricePickup
            const parsedPricePickup = parseFloat(pricePickup);
            if (isNaN(parsedPricePickup) || parsedPricePickup < 0) {
                return res.status(400).json({ message: 'Le prix pickup doit être un nombre valide et positif' });
            }

            // Calculer le coût de livraison total AVANT de créer le bundle
            // (pour pouvoir calculer le prix immédiatement)
            let totalDeliveryCost = 0;
            products.forEach(product => {
                const bundleItem = includedProducts.find(ip =>
                    ip.product.toString() === product._id.toString()
                );
                if (bundleItem) {
                    totalDeliveryCost += (product.deliveryCostToSchool || 0) * (bundleItem.quantity || 1);
                }
            });

            // Get supplier pricing settings
            const Supplier = (await import('../../../models/Supplier')).default;
            const supplier = await Supplier.findById(supplierId).lean();
            const pricingSettings = supplier?.pricingSettings || { markup: 5, handlesShipping: false };
            const markupMultiplier = 1 + (pricingSettings.markup / 100);

            // Calculer le prix maintenant (pricePickup * markup + deliveryCost if supplier doesn't handle shipping)
            // If supplier handles shipping, delivery cost should be 0 for price calculation
            const handlesShipping = pricingSettings.handlesShipping || false;
            const effectiveDeliveryCost = handlesShipping ? 0 : totalDeliveryCost;
            const basePrice = parsedPricePickup * markupMultiplier;
            const totalPrice = basePrice + effectiveDeliveryCost;
            // Round down to nearest 5 cents
            const calculatedPrice = Math.floor(totalPrice * 20) / 20;

            // Get all items (products + bundles) for this supplier to calculate next order
            // and ensure no duplicate orders exist
            // Note: Product is already imported above at line 41
            const allProducts = await Product.find({ supplier: supplierId }).select('order productId').lean();
            const allBundles = await Bundle.find({ supplier: supplierId }).select('order').lean();

            // Mark items with their type for later identification
            const productsWithType = allProducts.map(p => ({ ...p, _itemType: 'product' }));
            const bundlesWithType = allBundles.map(b => ({ ...b, _itemType: 'bundle' }));
            const allItems = [...productsWithType, ...bundlesWithType];

            // Check if there are duplicate orders and reorganize if needed
            const orderCounts = {};
            allItems.forEach(item => {
                const order = item.order || 0;
                orderCounts[order] = (orderCounts[order] || 0) + 1;
            });

            // If there are duplicates, reorganize all items to have sequential orders (0, 1, 2, ...)
            const hasDuplicates = Object.values(orderCounts).some(count => count > 1);
            if (hasDuplicates) {
                // Sort items by current order (and _id for stability)
                allItems.sort((a, b) => {
                    const orderA = a.order || 0;
                    const orderB = b.order || 0;
                    if (orderA !== orderB) return orderA - orderB;
                    return a._id.toString().localeCompare(b._id.toString());
                });

                // Reassign sequential orders
                for (let i = 0; i < allItems.length; i++) {
                    const item = allItems[i];
                    const newOrder = i;

                    // Only update if order changed
                    if ((item.order || 0) !== newOrder) {
                        if (item._itemType === 'product') {
                            // It's a Product
                            await Product.updateOne({ _id: item._id }, { $set: { order: newOrder } });
                        } else {
                            // It's a Bundle
                            await Bundle.updateOne({ _id: item._id }, { $set: { order: newOrder } });
                        }
                    }
                }
            }

            // Find max order after potential reorganization
            const maxOrder = allItems.length > 0
                ? Math.max(...allItems.map(item => item.order || 0))
                : -1;
            const nextOrder = maxOrder + 1;

            // Parse recommendedRetailPrice if provided (handle empty strings and valid numbers)
            let parsedRecommendedRetailPrice = undefined;
            if (recommendedRetailPrice !== undefined && recommendedRetailPrice !== null && recommendedRetailPrice !== '') {
                const parsed = parseFloat(recommendedRetailPrice);
                if (!isNaN(parsed) && parsed >= 0) {
                    parsedRecommendedRetailPrice = parsed;
                }
            }

            // Create bundle avec le prix déjà calculé
            const bundle = new Bundle({
                name,
                description: description || '',
                pricePickup: parsedPricePickup,
                recommendedRetailPrice: parsedRecommendedRetailPrice,
                price: calculatedPrice, // Prix calculé explicitement
                deliveryCostToSchool: totalDeliveryCost, // Coût de livraison calculé explicitement
                image: image || '',
                includedProducts: includedProducts.map(ip => ({
                    product: ip.product,
                    quantity: ip.quantity || 1
                })),
                supplier: supplierId,
                order: nextOrder
            });

            // Le hook pre('save') calculera aussi le prix (pour être sûr), mais on l'a déjà fait
            await bundle.save();

            res.status(201).json({ message: 'Bundle créé avec succès', bundle });
        } catch (error) {
            console.error('Error creating bundle:', error);
            res.status(500).json({ message: 'Erreur lors de la création du bundle', error: error.message });
        }
    } else if (req.method === 'GET') {
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

            const bundles = await Bundle.find({ supplier: supplierId })
                .populate('includedProducts.product')
                .sort({ order: 1 })
                .lean();

            res.status(200).json({ bundles });
        } catch (error) {
            console.error('Error fetching bundles:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des bundles', error: error.message });
        }
    } else if (req.method === 'PATCH') {
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
            const Supplier = (await import('../../../models/Supplier')).default;
            const supplier = await Supplier.findById(supplierId).lean();
            const pricingSettings = supplier?.pricingSettings || { markup: 5, handlesShipping: false };
            const markupMultiplier = 1 + (pricingSettings.markup / 100);

            const { bundleId, name, description, pricePickup, recommendedRetailPrice, image, includedProducts } = req.body;

            if (!bundleId) {
                return res.status(400).json({ message: 'bundleId est requis' });
            }

            // Find the bundle
            const bundle = await Bundle.findById(bundleId);
            if (!bundle) {
                return res.status(404).json({ message: 'Bundle non trouvé' });
            }

            // Verify bundle belongs to this supplier
            if (bundle.supplier.toString() !== supplierId.toString()) {
                return res.status(403).json({ message: 'Ce bundle ne vous appartient pas' });
            }

            // Update fields if provided
            if (name !== undefined) bundle.name = name;
            if (description !== undefined) bundle.description = description;
            if (image !== undefined) bundle.image = image;

            // Handle pricePickup update
            if (pricePickup !== undefined) {
                const parsedPricePickup = parseFloat(pricePickup);
                if (isNaN(parsedPricePickup) || parsedPricePickup < 0) {
                    return res.status(400).json({ message: 'Le prix pickup doit être un nombre valide et positif' });
                }
                bundle.pricePickup = parsedPricePickup;
            }

            // Handle recommendedRetailPrice update
            if (recommendedRetailPrice !== undefined) {
                if (recommendedRetailPrice === '' || recommendedRetailPrice === null) {
                    bundle.recommendedRetailPrice = undefined;
                } else {
                    const parsed = parseFloat(recommendedRetailPrice);
                    if (!isNaN(parsed) && parsed >= 0) {
                        bundle.recommendedRetailPrice = parsed;
                    }
                }
            }

            // Handle includedProducts update
            if (includedProducts !== undefined && Array.isArray(includedProducts)) {
                if (includedProducts.length === 0) {
                    return res.status(400).json({ message: 'Le bundle doit contenir au moins un produit' });
                }

                // Verify all products belong to this supplier
                const Product = (await import('../../../models/Product')).default;
                const productIds = includedProducts.map(ip => ip.product);
                const products = await Product.find({ _id: { $in: productIds } });

                const invalidProducts = products.filter(p => p.supplier.toString() !== supplierId.toString());
                if (invalidProducts.length > 0) {
                    return res.status(400).json({ message: 'Certains produits ne vous appartiennent pas' });
                }

                // Recalculate delivery cost based on new included products
                let totalDeliveryCost = 0;
                products.forEach(product => {
                    const bundleItem = includedProducts.find(ip =>
                        ip.product.toString() === product._id.toString()
                    );
                    if (bundleItem) {
                        totalDeliveryCost += (product.deliveryCostToSchool || 0) * (bundleItem.quantity || 1);
                    }
                });

                bundle.deliveryCostToSchool = totalDeliveryCost;
                bundle.includedProducts = includedProducts.map(ip => ({
                    product: ip.product,
                    quantity: ip.quantity || 1
                }));
            }

            // Recalculate price if pricePickup or deliveryCostToSchool changed
            // If supplier handles shipping, delivery cost should be 0 for price calculation
            const handlesShipping = pricingSettings.handlesShipping || false;
            const effectiveDeliveryCost = handlesShipping ? 0 : bundle.deliveryCostToSchool;
            const basePrice = bundle.pricePickup * markupMultiplier;
            const totalPrice = basePrice + effectiveDeliveryCost;
            // Round down to nearest 5 cents
            bundle.price = Math.floor(totalPrice * 20) / 20;

            await bundle.save();

            // Populate includedProducts for response
            await bundle.populate('includedProducts.product');

            res.status(200).json({ message: 'Bundle mis à jour avec succès', bundle });
        } catch (error) {
            console.error('Error updating bundle:', error);
            res.status(500).json({ message: 'Erreur lors de la mise à jour du bundle', error: error.message });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}

