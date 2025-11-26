import dbConnect from '../../../lib/mongodb';
import Supplier from '../../../models/Supplier';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';
import multer from 'multer';
import cloudinary from '@/utils/cloudinary';

// Configure multer for memory storage (Cloudinary needs buffer)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Disable Next.js body parser to handle multipart/form-data
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        // Use multer to handle file upload
        await new Promise((resolve, reject) => {
            upload.single('chequeSpecimen')(req, res, (err) => {
                if (err) {
                    console.error('Multer error:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        const chequeFile = req.file;

        if (!chequeFile) {
            return res.status(400).json({ message: 'Aucun fichier fourni' });
        }

        // Get supplier for this user
        const supplierManager = await SupplierManager.findOne({
            user: token.sub,
            status: 'active'
        }).populate('supplier');

        if (!supplierManager || !supplierManager.supplier) {
            return res.status(404).json({ message: 'Fournisseur non trouvé' });
        }

        // Check if user can edit supplier settings
        if (!['owner', 'admin'].includes(supplierManager.role)) {
            return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier les paramètres du fournisseur' });
        }

        const supplier = supplierManager.supplier;

        // Upload to Cloudinary
        const uploadStr = chequeFile.buffer.toString('base64');
        console.log('Uploading cheque specimen to Cloudinary, file size:', chequeFile.buffer.length);

        const uploadResult = await cloudinary.uploader.upload(
            `data:${chequeFile.mimetype};base64,${uploadStr}`,
            {
                folder: 'supplier-cheques',
                resource_type: 'image',
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            }
        );

        const cloudinaryUrl = uploadResult.secure_url;

        console.log('Cloudinary upload result:', {
            url: cloudinaryUrl
        });

        // Delete old cheque specimen from Cloudinary if it exists
        if (supplier.paymentInfo?.chequeSpecimen) {
            try {
                // Extract public_id from URL if it's a Cloudinary URL
                const oldUrl = supplier.paymentInfo.chequeSpecimen;
                if (oldUrl.includes('cloudinary.com')) {
                    const publicIdMatch = oldUrl.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)/);
                    if (publicIdMatch) {
                        const publicId = publicIdMatch[1];
                        await cloudinary.uploader.destroy(publicId);
                    }
                }
            } catch (error) {
                console.error('Error deleting old cheque specimen from Cloudinary:', error);
                // Continue even if old file deletion fails
            }
        }

        // Initialize paymentInfo if it doesn't exist
        if (!supplier.paymentInfo) {
            supplier.paymentInfo = {};
        }

        // Update supplier with new cheque specimen URL - utiliser updateOne directement pour forcer la sauvegarde
        const mongoose = (await import('mongoose')).default;
        const db = mongoose.connection.db;

        const updatedPaymentInfo = {
            ...supplier.paymentInfo,
            chequeSpecimen: cloudinaryUrl
        };

        const updateResult = await db.collection('suppliers').updateOne(
            { _id: new mongoose.Types.ObjectId(supplier._id) },
            { $set: { paymentInfo: updatedPaymentInfo } }
        );

        console.log('[Upload Cheque API] Update result:', {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount
        });

        // Vérifier que la sauvegarde a fonctionné
        const updatedSupplier = await db.collection('suppliers').findOne(
            { _id: new mongoose.Types.ObjectId(supplier._id) }
        );

        console.log('[Upload Cheque API] PaymentInfo after save:', JSON.stringify(updatedSupplier.paymentInfo));

        res.status(200).json({
            message: 'Spécimen de chèque uploadé avec succès',
            chequeSpecimenUrl: cloudinaryUrl
        });

    } catch (error) {
        console.error('Error uploading cheque specimen:', error);

        if (error.message === 'Only image files are allowed') {
            return res.status(400).json({ message: 'Seuls les fichiers image sont autorisés' });
        }

        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
}

