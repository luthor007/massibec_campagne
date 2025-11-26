import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import SupplierManager from '../../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    const { productId } = req.query;

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

        if (req.method === 'GET') {
            const product = await Product.findOne({
                _id: productId,
                supplier: supplierId
            });

            if (!product) {
                return res.status(404).json({ message: 'Produit non trouvé' });
            }

            res.status(200).json({ product });
        } else if (req.method === 'PUT') {
            // Check permissions
            if (!['owner', 'admin'].includes(supplierManager.role)) {
                return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier des produits' });
            }

            const product = await Product.findOne({
                _id: productId,
                supplier: supplierId
            });

            if (!product) {
                return res.status(404).json({ message: 'Produit non trouvé' });
            }

            const { name, description, pricePickup, recommendedRetailPrice, deliveryCostToSchool, directToConsumerEnabled, image, ingredientsImage, nutritionImage, attributes, unitSize, casePack, pallet, refrigerated, packagingGroup } = req.body;

            // Get supplier pricing settings
            const Supplier = (await import('../../../../models/Supplier')).default;
            const supplier = await Supplier.findById(supplierId).lean();
            const pricingSettings = supplier?.pricingSettings || { markup: 5, handlesShipping: false };
            const markupMultiplier = 1 + (pricingSettings.markup / 100);

            if (name) product.name = name;
            if (description !== undefined) product.description = description;
            if (pricePickup !== undefined) {
                const pricePickupValue = parseFloat(pricePickup);
                product.pricePickup = pricePickupValue;
                // Recalculate price from pricePickup (pricePickup * markup + deliveryCostToSchool if supplier doesn't handle shipping)
                const deliveryCost = deliveryCostToSchool !== undefined ? parseFloat(deliveryCostToSchool) : (product.deliveryCostToSchool || 0);
                // If supplier handles shipping, delivery cost should be 0 for price calculation
                const handlesShipping = pricingSettings.handlesShipping || false;
                const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCost;
                const basePrice = pricePickupValue * markupMultiplier;
                const totalPrice = basePrice + effectiveDeliveryCost;
                // Round down to nearest 5 cents
                product.price = Math.floor(totalPrice * 20) / 20;
            }
            if (deliveryCostToSchool !== undefined) {
                const deliveryCost = parseFloat(deliveryCostToSchool) || 0;
                product.deliveryCostToSchool = deliveryCost;
                // Recalculate price if pricePickup is set
                if (product.pricePickup) {
                    // If supplier handles shipping, delivery cost should be 0 for price calculation
                    const handlesShipping = pricingSettings.handlesShipping || false;
                    const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCost;
                    const basePrice = product.pricePickup * markupMultiplier;
                    const totalPrice = basePrice + effectiveDeliveryCost;
                    // Round down to nearest 5 cents
                    product.price = Math.floor(totalPrice * 20) / 20;
                }
            }
            if (directToConsumerEnabled !== undefined) {
                // Get supplier settings to check if directToConsumer is enabled globally
                const supplierDirectToConsumerEnabled = supplier?.deliverySettings?.directToConsumerEnabled || false;
                product.directToConsumerEnabled = supplierDirectToConsumerEnabled && (directToConsumerEnabled === true || directToConsumerEnabled === 'true');
            }
            if (recommendedRetailPrice !== undefined) {
                product.recommendedRetailPrice = recommendedRetailPrice ? parseFloat(recommendedRetailPrice) : undefined;
            }
            if (image !== undefined) product.image = image;
            if (ingredientsImage !== undefined) product.ingredientsImage = ingredientsImage;
            if (nutritionImage !== undefined) product.nutritionImage = nutritionImage;
            if (attributes) product.attributes = { ...product.attributes, ...attributes };
            if (unitSize !== undefined) product.unitSize = unitSize;
            if (casePack !== undefined) product.casePack = casePack;
            if (pallet !== undefined) product.pallet = pallet;
            if (refrigerated !== undefined) product.refrigerated = refrigerated;
            if (packagingGroup !== undefined) product.packagingGroup = packagingGroup;

            await product.save();

            res.status(200).json({ product });
        } else if (req.method === 'DELETE') {
            // Check permissions
            if (!['owner', 'admin'].includes(supplierManager.role)) {
                return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer des produits' });
            }

            const product = await Product.findOne({
                _id: productId,
                supplier: supplierId
            });

            if (!product) {
                return res.status(404).json({ message: 'Produit non trouvé' });
            }

            await Product.deleteOne({ _id: productId });

            res.status(200).json({ message: 'Produit supprimé avec succès' });
        } else {
            res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
            res.status(405).json({ message: 'Méthode non autorisée' });
        }
    } catch (error) {
        console.error('Error in product API:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
}

