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
            upload.single('logo')(req, res, (err) => {
                if (err) {
                    console.error('Multer error:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        const logoFile = req.file;

        if (!logoFile) {
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
        const uploadStr = logoFile.buffer.toString('base64');
        console.log('Uploading logo to Cloudinary, file size:', logoFile.buffer.length);

        const uploadResult = await cloudinary.uploader.upload(
            `data:${logoFile.mimetype};base64,${uploadStr}`,
            {
                folder: 'supplier-logos',
                resource_type: 'image',
                transformation: [
                    { width: 500, height: 500, crop: 'limit' }
                ]
            }
        );

        const cloudinaryUrl = uploadResult.secure_url;
        const cloudinaryPublicId = uploadResult.public_id;

        console.log('Cloudinary upload result:', {
            url: cloudinaryUrl,
            publicId: cloudinaryPublicId
        });

        // Delete old logo from Cloudinary if it exists
        if (supplier.logo) {
            try {
                // Check if it's a Cloudinary public_id or URL
                let publicIdToDelete = supplier.logo;

                // If it's a URL, extract public_id
                if (supplier.logo.includes('cloudinary.com')) {
                    const publicIdMatch = supplier.logo.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)/);
                    if (publicIdMatch) {
                        publicIdToDelete = publicIdMatch[1];
                    }
                } else if (supplier.logo.startsWith('supplier-logos/')) {
                    // It's already a public_id
                    publicIdToDelete = supplier.logo;
                }

                await cloudinary.uploader.destroy(publicIdToDelete);
                console.log('Old logo deleted from Cloudinary:', publicIdToDelete);
            } catch (error) {
                console.error('Error deleting old logo from Cloudinary:', error);
                // Continue even if old file deletion fails
            }
        }

        // Update supplier with new logo
        await Supplier.findByIdAndUpdate(
            supplier._id,
            { logo: cloudinaryPublicId },
            { new: true }
        );

        res.status(200).json({
            message: 'Logo uploadé avec succès',
            logoUrl: cloudinaryUrl,
            logo: cloudinaryPublicId
        });

    } catch (error) {
        console.error('Error uploading logo:', error);

        if (error.message === 'Only image files are allowed') {
            return res.status(400).json({ message: 'Seuls les fichiers image sont autorisés' });
        }

        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
}


