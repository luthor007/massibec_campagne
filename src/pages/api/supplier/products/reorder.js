import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import Bundle from '../../../../models/Bundle';
import SupplierManager from '../../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
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
        const { productId, newOrder } = req.body;

        if (!productId || newOrder === undefined) {
            return res.status(400).json({ message: 'productId et newOrder sont requis' });
        }

        // Try to find as product first, then as bundle
        let item = await Product.findById(productId);
        let isBundle = false;

        if (!item) {
            item = await Bundle.findById(productId);
            isBundle = true;
        }

        if (!item) {
            return res.status(404).json({ message: 'Produit ou bundle non trouvé' });
        }

        // Verify item belongs to this supplier
        if (item.supplier.toString() !== supplierId.toString()) {
            return res.status(403).json({ message: 'Ce produit/bundle ne vous appartient pas' });
        }

        const oldOrder = item.order || 0;

        // Get all products and bundles for this supplier, sorted by order
        const allProducts = await Product.find({ supplier: supplierId }).sort({ order: 1 });
        const allBundles = await Bundle.find({ supplier: supplierId }).sort({ order: 1 });
        const allItems = [...allProducts, ...allBundles];

        // Update orders
        if (newOrder > oldOrder) {
            // Moving down: shift items between oldOrder and newOrder up
            for (const p of allItems) {
                const pOrder = p.order || 0;
                if (pOrder > oldOrder && pOrder <= newOrder && p._id.toString() !== productId) {
                    p.order = pOrder - 1;
                    await p.save();
                }
            }
        } else if (newOrder < oldOrder) {
            // Moving up: shift items between newOrder and oldOrder down
            for (const p of allItems) {
                const pOrder = p.order || 0;
                if (pOrder >= newOrder && pOrder < oldOrder && p._id.toString() !== productId) {
                    p.order = pOrder + 1;
                    await p.save();
                }
            }
        }

        // Update the moved item
        item.order = newOrder;
        await item.save();

        res.status(200).json({ message: 'Ordre mis à jour avec succès', product: item });
    } catch (error) {
        console.error('Error reordering products:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'ordre', error: error.message });
    }
}

