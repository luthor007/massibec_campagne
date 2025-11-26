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
            const paymentInfo = supplier?.paymentInfo || {
                preferredMethod: 'virement',
                bankName: '',
                accountNumber: '',
                transitNumber: '',
                notes: '',
                chequeSpecimen: null
            };

            res.status(200).json({ paymentInfo });
        } catch (error) {
            console.error('Error fetching payment info:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des informations de paiement' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ message: 'Méthode non autorisée' });
    }
}

