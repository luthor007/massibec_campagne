import dbConnect from '../../lib/mongodb';
import Store from '../../models/Store';
import User from '../../models/User';
import { getToken } from 'next-auth/jwt';  // Import getToken
import { generateSlug } from '../../utils/slugHelpers';
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
  try {
    await dbConnect();  // Ensure the database connection

    // Extract the token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas logged in' });
    }

    const userId = token.sub;  // Extract the user ID from the token

    if (req.method === 'POST') {
      const { name, description, hoursAvailable, autoDeposit, discountEnabled, deliveryOptions, campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ message: 'campaignId est requis' });
      }

      try {
        // Normalize campaignId to ObjectId for consistent comparison
        const normalizedCampaignId = mongoose.Types.ObjectId.isValid(campaignId)
          ? new mongoose.Types.ObjectId(campaignId)
          : campaignId;

        console.log('[personnalisation POST] userId:', userId, 'campaignId:', campaignId, 'normalizedCampaignId:', normalizedCampaignId);

        // Find store by user and campaignId
        // First try with normalized ObjectId, then fallback to string comparison
        let store = await Store.findOne({
          user: userId,
          campaignId: normalizedCampaignId
        });

        // If not found with ObjectId, try with string (for backwards compatibility)
        if (!store) {
          store = await Store.findOne({
            user: userId,
            campaignId: campaignId
          });
        }

        console.log('[personnalisation POST] Store found:', !!store, store ? `Store ID: ${store._id}` : 'No store');

        // Get user and campaign info for slug generation
        const user = await User.findById(userId);
        // Campaign fetch removed - not needed for slug generation

        if (store) {
          // Update existing store
          store.campaignId = normalizedCampaignId;
          store.name = name;
          store.description = description;
          store.hoursAvailable = hoursAvailable || store.hoursAvailable;
          store.autoDeposit = autoDeposit;
          store.discountEnabled = discountEnabled !== undefined ? discountEnabled : true;
          if (deliveryOptions && Array.isArray(deliveryOptions) && deliveryOptions.length > 0) {
            // Normalize deliveryOptions - handle both old (strings) and new (objects) formats
            let normalizedOptions = deliveryOptions.map(opt => {
              if (typeof opt === 'string') {
                // Old format: migrate to new format
                const migrationMap = {
                  'Travail': { name: 'Travail', enabled: true },
                  'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                  'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                  'Autre': { name: 'Autre', enabled: true }
                };
                return migrationMap[opt] || { name: opt, enabled: true };
              }
              // New format: ensure all fields are present
              if (!opt || !opt.name) {
                console.warn('Invalid delivery option in POST:', opt);
                return null;
              }
              return {
                name: opt.name,
                enabled: opt.enabled !== undefined ? opt.enabled : true,
                pickupAddress: opt.pickupAddress || '',
                deliveryRadius: opt.deliveryRadius || ''
              };
            }).filter(Boolean); // Remove null entries

            // If we have no valid options after filtering, use defaults
            if (normalizedOptions.length === 0) {
              normalizedOptions = [
                { name: 'Travail', enabled: true },
                { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                { name: 'Autre', enabled: true }
              ];
            }

            // Ensure "Autre" is always present and enabled
            const hasAutre = normalizedOptions.some(opt => opt.name === 'Autre');
            if (!hasAutre) {
              normalizedOptions.push({ name: 'Autre', enabled: true });
            } else {
              // Ensure "Autre" is enabled
              normalizedOptions = normalizedOptions.map(opt => {
                if (opt.name === 'Autre') {
                  return { ...opt, enabled: true };
                }
                return opt;
              });
            }

            store.deliveryOptions = normalizedOptions;
          }
          // If deliveryOptions not provided, the pre-save hook will set defaults

          // Auto-generate slug if not set
          if (!store.slug && user) {
            const baseSlug = generateSlug(user.name);
            let generatedSlug = baseSlug;
            let counter = 1;

            // Check for uniqueness globally (slug is unique across all stores) and reserved routes
            while (
              await Store.findOne({ slug: generatedSlug, _id: { $ne: store._id } }) ||
              RESERVED_ROUTES.includes(generatedSlug)
            ) {
              generatedSlug = `${baseSlug}-${counter}`;
              counter++;
            }

            store.slug = generatedSlug;
          }
        } else {
          // Store doesn't exist - create new one for this campaign
          // Always auto-generate slug from user name
          let storeSlug = null;
          if (user) {
            const baseSlug = generateSlug(user.name);
            let generatedSlug = baseSlug;
            let counter = 1;

            // Check for uniqueness globally (slug is unique across all stores) and reserved routes
            while (
              await Store.findOne({ slug: generatedSlug }) ||
              RESERVED_ROUTES.includes(generatedSlug)
            ) {
              generatedSlug = `${baseSlug}-${counter}`;
              counter++;
            }

            storeSlug = generatedSlug;
          }

          store = new Store({
            user: userId,
            campaignId: normalizedCampaignId,
            name: name,
            description: description,
            hoursAvailable: hoursAvailable || '18h-20h',
            autoDeposit: autoDeposit,
            discountEnabled: discountEnabled !== undefined ? discountEnabled : true,
            deliveryOptions: (() => {
              if (deliveryOptions && Array.isArray(deliveryOptions) && deliveryOptions.length > 0) {
                // Normalize deliveryOptions - handle both old (strings) and new (objects) formats
                let normalizedOptions = deliveryOptions.map(opt => {
                  if (typeof opt === 'string') {
                    // Old format: migrate to new format
                    const migrationMap = {
                      'Travail': { name: 'Travail', enabled: true },
                      'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                      'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                      'Autre': { name: 'Autre', enabled: true }
                    };
                    return migrationMap[opt] || { name: opt, enabled: true };
                  }
                  // New format: ensure all fields are present
                  return {
                    name: opt.name || 'Autre',
                    enabled: opt.enabled !== undefined ? opt.enabled : true,
                    pickupAddress: opt.pickupAddress || '',
                    deliveryRadius: opt.deliveryRadius || ''
                  };
                });

                // Ensure "Autre" is always present and enabled
                const hasAutre = normalizedOptions.some(opt => opt.name === 'Autre');
                if (!hasAutre) {
                  normalizedOptions.push({ name: 'Autre', enabled: true });
                } else {
                  normalizedOptions = normalizedOptions.map(opt => {
                    if (opt.name === 'Autre') {
                      return { ...opt, enabled: true };
                    }
                    return opt;
                  });
                }

                return normalizedOptions;
              }
              // Default options - pre-save hook will also handle this
              return [
                { name: 'Travail', enabled: true },
                { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                { name: 'Autre', enabled: true }
              ];
            })(),
            slug: storeSlug
          });
        }

        await store.save();

        console.log('[personnalisation POST] Store saved successfully. Store ID:', store._id, 'campaignId:', store.campaignId?.toString() || store.campaignId, 'slug:', store.slug);

        // Return slug URL if available, otherwise fallback to ID
        const storeUrl = store.slug ? `/${store.slug}` : `/boutique/${store._id}`;
        res.status(200).json({
          message: 'Boutique personnalisée avec succès',
          storeUrl,
          slug: store.slug
        });
      } catch (error) {
        res.status(400).json({ message: `Erreur lors de la personnalisation: ${error.message}` });
      }

    } else if (req.method === 'GET') {
      try {
        const { campaignId } = req.query;

        if (!campaignId) {
          return res.status(400).json({ message: 'campaignId est requis' });
        }

        // Normalize campaignId to ObjectId for consistent comparison
        const normalizedCampaignId = mongoose.Types.ObjectId.isValid(campaignId)
          ? new mongoose.Types.ObjectId(campaignId)
          : campaignId;

        console.log('[personnalisation GET] userId:', userId, 'campaignId:', campaignId, 'normalizedCampaignId:', normalizedCampaignId);

        // Find store by user and campaignId
        // First try with normalized ObjectId, then fallback to string comparison
        let store = await Store.findOne({
          user: userId,
          campaignId: normalizedCampaignId
        });

        // If not found with ObjectId, try with string (for backwards compatibility)
        if (!store) {
          store = await Store.findOne({
            user: userId,
            campaignId: campaignId
          });
        }

        console.log('[personnalisation GET] Store found:', !!store, store ? `Store ID: ${store._id}` : 'No store');

        if (!store) {
          // Return default values if store doesn't exist
          // Get user's campaigns with school logos for reference
          const user = await User.findById(userId)
            .populate('campaigns.campaignId', 'campaignNumber campaignCode status isActive')
            .populate('campaigns.schoolId', 'name code logo')
            .lean();
          const campaigns = user?.campaigns || [];

          // Helper function to convert Cloudinary public_id to URL
          const getLogoUrl = (logo) => {
            if (!logo) return null;
            if (logo.startsWith('http')) return logo;
            if (logo.startsWith('school-logo/')) {
              const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
              return `https://res.cloudinary.com/${cloudName}/image/upload/${logo}.png`;
            }
            return null;
          };

          return res.status(200).json({
            name: '',
            description: '',
            hoursAvailable: '',
            colorPalette: '#000000',
            autoDeposit: false,
            discountEnabled: true,
            deliveryOptions: [
              { name: 'Travail', enabled: true },
              { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
              { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
              { name: 'Autre', enabled: true }
            ],
            slug: null,
            campaignId: campaignId,
            campaigns: campaigns.map(c => {
              const campaign = c.campaignId;
              const school = c.schoolId;
              return {
                campaignId: campaign?._id?.toString() || c.campaignId?.toString() || c.campaignId,
                schoolId: school?._id?.toString() || c.schoolId?.toString() || c.schoolId,
                isActive: c.isActive,
                campaignNumber: campaign?.campaignNumber,
                campaignCode: campaign?.campaignCode,
                school: school ? {
                  _id: school._id,
                  name: school.name,
                  code: school.code,
                  logo: getLogoUrl(school.logo)
                } : null
              };
            })
          });
        }

        // Get user's campaigns with school logos for reference
        const user = await User.findById(userId)
          .populate('campaigns.campaignId', 'campaignNumber campaignCode status isActive')
          .populate('campaigns.schoolId', 'name code logo')
          .lean();
        const campaigns = user?.campaigns || [];

        // Helper function to convert Cloudinary public_id to URL
        const getLogoUrl = (logo) => {
          if (!logo) return null;
          if (logo.startsWith('http')) return logo;
          if (logo.startsWith('school-logo/')) {
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
            return `https://res.cloudinary.com/${cloudName}/image/upload/${logo}.png`;
          }
          return null;
        };

        res.status(200).json({
          name: store.name,
          description: store.description,
          hoursAvailable: store.hoursAvailable || '',
          colorPalette: store.colorPalette,
          autoDeposit: store.autoDeposit,
          discountEnabled: store.discountEnabled,
          deliveryOptions: (() => {
            // Ensure deliveryOptions are in the new format
            if (store.deliveryOptions && Array.isArray(store.deliveryOptions) && store.deliveryOptions.length > 0) {
              // If old format (strings), migrate
              if (typeof store.deliveryOptions[0] === 'string') {
                const migrationMap = {
                  'Travail': { name: 'Travail', enabled: true },
                  'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                  'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                  'Autre': { name: 'Autre', enabled: true }
                };
                return store.deliveryOptions.map(opt => {
                  if (typeof opt === 'string') {
                    return migrationMap[opt] || { name: opt, enabled: true };
                  }
                  return opt;
                });
              }
              // Already in new format
              const validOptions = store.deliveryOptions.map(opt => {
                // Ensure name exists and is not empty
                if (!opt || !opt.name) {
                  console.warn('Invalid delivery option in store:', opt);
                  return null;
                }
                return {
                  name: opt.name,
                  enabled: opt.enabled !== undefined ? opt.enabled : true,
                  pickupAddress: opt.pickupAddress || '',
                  deliveryRadius: opt.deliveryRadius || ''
                };
              }).filter(Boolean); // Remove null entries

              // If we have no valid options, return defaults
              if (validOptions.length === 0) {
                return [
                  { name: 'Travail', enabled: true },
                  { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                  { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                  { name: 'Autre', enabled: true }
                ];
              }

              // Ensure "Autre" is present
              const hasAutre = validOptions.some(opt => opt.name === 'Autre');
              if (!hasAutre) {
                validOptions.push({ name: 'Autre', enabled: true });
              }

              return validOptions;
            }
            // Default options
            return [
              { name: 'Travail', enabled: true },
              { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
              { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
              { name: 'Autre', enabled: true }
            ];
          })(),
          slug: store.slug || null,
          campaignId: store.campaignId?.toString() || store.campaignId,
          campaigns: campaigns.map(c => {
            const campaign = c.campaignId;
            const school = c.schoolId;
            return {
              campaignId: campaign?._id?.toString() || c.campaignId?.toString() || c.campaignId,
              schoolId: school?._id?.toString() || c.schoolId?.toString() || c.schoolId,
              isActive: c.isActive,
              campaignNumber: campaign?.campaignNumber,
              campaignCode: campaign?.campaignCode,
              school: school ? {
                _id: school._id,
                name: school.name,
                code: school.code,
                logo: getLogoUrl(school.logo)
              } : null
            };
          })
        });

      } catch (error) {
        res.status(400).json({ message: `Erreur lors de la récupération de la boutique: ${error.message}` });
      }

    } else {
      res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}