// src/pages/api/stores/check-slug/[slug].js
import dbConnect from '../../../../lib/mongodb';
import Store from '../../../../models/Store';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

// List of reserved routes that users cannot use as slugs
const RESERVED_ROUTES = [
    // Authentication and user management
    'dashboard',
    'dashboard-manager',
    'dashboard-massibec',
    'connexion',
    'inscription',
    'inscription-manager',
    'email-verification',
    'email-verified',
    'email-verification-error',
    'resend-verification',
    'forgot-password',
    'reset-password',
    'test-email',
    'test-inscription',

    // Dashboard sub-routes
    'commandes',
    'personnalisation',
    'statistiques',
    'vendre',
    'vendre-old',
    'vendre-v2',

    // Dashboard manager sub-routes (if any)

    // Dashboard massibec sub-routes
    'campaigns',
    'orders',
    'products',
    'schools',
    'settings',
    'analytics',

    // Other pages
    'detail',
    'boutique',
    'managers',

    // System routes
    'api',
    '_app',
    '_document',
    'favicon.ico',

    // Common reserved names
    'admin',
    'app',
    'www',
    'www2',
    'mail',
    'ftp',
    'localhost',
    'about',
    'contact',
    'help',
    'support',
    'terms',
    'privacy',
    'legal',
    'blog',
    'news',
    'shop',
    'store',
    'stores',
    'product',
    'products',
    'cart',
    'checkout',
    'account',
    'profile',
    'settings',
    'login',
    'logout',
    'signup',
    'signin',
    'register',
    'user',
    'users',
    'campaign',
    'campaigns',
    'school',
    'schools',
    'order',
    'orders',
    'student',
    'students',
    'manager',
    'managers'
];

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        // Get authenticated user
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const userId = token.sub;
        const { slug } = req.query;
        const { campaignId } = req.query; // Optional: current campaign ID being edited

        if (!slug || slug.trim() === '') {
            return res.status(200).json({ available: false, reason: 'empty' });
        }

        // Sanitize slug
        const sanitizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

        if (sanitizedSlug !== slug) {
            return res.status(200).json({ available: false, reason: 'invalid_format' });
        }

        // Check if slug is a reserved route
        if (RESERVED_ROUTES.includes(sanitizedSlug)) {
            return res.status(200).json({
                available: false,
                reason: 'reserved',
                message: 'Cette URL est réservée et ne peut pas être utilisée'
            });
        }

        // Get current user's store for this campaign (if campaignId is provided)
        let currentStore = null;
        if (campaignId) {
            // Normalize campaignId to ObjectId for consistent comparison
            const normalizedCampaignId = mongoose.Types.ObjectId.isValid(campaignId)
                ? new mongoose.Types.ObjectId(campaignId)
                : campaignId;

            // Try to find store with normalized ObjectId first
            currentStore = await Store.findOne({ user: userId, campaignId: normalizedCampaignId });

            // If not found, try with string (for backwards compatibility)
            if (!currentStore) {
                currentStore = await Store.findOne({ user: userId, campaignId: campaignId });
            }
        }

        console.log('[check-slug] slug:', sanitizedSlug, 'campaignId:', campaignId, 'currentStore:', currentStore?._id || 'null');

        // Check if slug already exists (excluding current user's store for this campaign)
        const existingStoreBySlug = await Store.findOne({
            slug: sanitizedSlug,
            _id: { $ne: currentStore?._id }
        });

        if (existingStoreBySlug) {
            return res.status(200).json({
                available: false,
                reason: 'taken',
                message: 'Cette URL est déjà utilisée par une autre boutique'
            });
        }

        return res.status(200).json({
            available: true,
            message: 'Cette URL est disponible'
        });

    } catch (error) {
        console.error('Error checking slug availability:', error);
        return res.status(500).json({ message: 'Erreur lors de la vérification' });
    }
}

