// pages/api/upload.js

import nextConnect from 'next-connect';
import multer from 'multer';
import cloudinary from '../../utils/cloudinary';
import { promisify } from 'util';

// Configure Multer storage (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
});

// Initialize next-connect
const apiRoute = nextConnect({
  onError(error, req, res) {
    console.error(error);
    res.status(501).json({ error: `Sorry something Happened! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

// Handle POST requests with Multer middleware
apiRoute.use(upload.single('image'));

apiRoute.post(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    // Determine folder based on upload type (default to 'products' for backward compatibility)
    // req.body contains FormData fields after multer processing
    const uploadType = req.body?.type || 'product'; // 'product', 'student-photo', etc.
    let folder = 'products';

    if (uploadType === 'student-photo') {
      folder = 'student-photos';
    } else if (uploadType === 'product') {
      folder = 'products';
    }

    console.log('[upload] Uploading image to folder:', folder, 'type:', uploadType);

    // Upload image buffer to Cloudinary
    const uploadStr = req.file.buffer.toString('base64');
    const uploadResponse = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${uploadStr}`, {
      folder: folder,
      resource_type: 'image',
      // Optimize images for web
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    res.status(200).json({ url: uploadResponse.secure_url });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Image upload failed.', error: error.message });
  }
});

export default apiRoute;

// Disable bodyParser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};