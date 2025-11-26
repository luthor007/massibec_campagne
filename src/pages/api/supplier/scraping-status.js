// src/pages/api/supplier/scraping-status.js
import dbConnect from '../../../lib/mongodb';
import Supplier from '../../../models/Supplier';
import Product from '../../../models/Product';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        // Authentification
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

        const supplier = supplierManager.supplier;

        // Compter les produits scrapés
        const productCount = await Product.countDocuments({ supplier: supplier._id });

        res.status(200).json({
            scrapingStatus: supplier.scrapingStatus || 'pending',
            scrapedAt: supplier.scrapedAt || null,
            productCount: productCount,
            website: supplier.website || null
        });

    } catch (error) {
        console.error('Error fetching scraping status:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du statut' });
    }
}



