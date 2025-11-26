import dbConnect from '@/lib/mongodb';
import School from '@/models/School';
import SchoolManager from '@/models/SchoolManager';
import User from '@/models/User';
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
        if (!token) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const { schoolId } = req.query;

        if (!schoolId) {
            return res.status(400).json({ message: 'School ID requis' });
        }

        // Check if user is a manager of this school
        let schoolManager = await SchoolManager.findOne({
            school: schoolId,
            user: token.sub,
            status: 'active'
        });

        if (!schoolManager) {
            // If no SchoolManager record exists, check if user is the original school manager
            const user = await User.findById(token.sub);
            if (!user || user.role !== 'school_manager') {
                return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette école' });
            }

            // Check if this user is associated with this school
            const schoolIdFromUser = user.schoolManagerInfo?.organisme;
            if (schoolIdFromUser?.toString() !== schoolId) {
                return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette école' });
            }

            // For backward compatibility, treat as owner
            schoolManager = { role: 'owner' };
        }

        // Check if user can edit school settings
        if (!['owner', 'admin'].includes(schoolManager.role)) {
            return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier les paramètres de l\'école' });
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

        // Get school
        const school = await School.findById(schoolId);

        if (!school) {
            return res.status(404).json({ message: 'École non trouvée' });
        }

        // Upload to Cloudinary
        const uploadStr = chequeFile.buffer.toString('base64');
        console.log('Uploading cheque specimen to Cloudinary, file size:', chequeFile.buffer.length);

        const uploadResult = await cloudinary.uploader.upload(
            `data:${chequeFile.mimetype};base64,${uploadStr}`,
            {
                folder: 'school-cheques',
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
        if (school.paymentInfo?.chequeSpecimen) {
            try {
                // Extract public_id from URL if it's a Cloudinary URL
                const oldUrl = school.paymentInfo.chequeSpecimen;
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
        if (!school.paymentInfo) {
            school.paymentInfo = {};
        }

        // Update school with new cheque specimen URL - utiliser updateOne directement pour forcer la sauvegarde
        const mongoose = (await import('mongoose')).default;
        const db = mongoose.connection.db;

        const updatedPaymentInfo = {
            ...school.paymentInfo,
            chequeSpecimen: cloudinaryUrl
        };

        const updateResult = await db.collection('schools').updateOne(
            { _id: new mongoose.Types.ObjectId(school._id) },
            { $set: { paymentInfo: updatedPaymentInfo } }
        );

        console.log('[Upload Cheque API] Update result:', {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount
        });

        // Vérifier que la sauvegarde a fonctionné
        const updatedSchool = await db.collection('schools').findOne(
            { _id: new mongoose.Types.ObjectId(school._id) }
        );

        console.log('[Upload Cheque API] PaymentInfo after save:', JSON.stringify(updatedSchool.paymentInfo));

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


