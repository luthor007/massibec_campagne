// src/models/Store.js
import mongoose from 'mongoose';
import User from './User'; // Ensure you import the User model
import { type } from 'os';
import { generateSlug } from '../utils/slugHelpers';

// Reserved routes that cannot be used as slugs
const RESERVED_ROUTES = [
  'dashboard', 'dashboard-manager', 'dashboard-massibec', 'dashboard-supplier',
  'connexion', 'inscription', 'inscription-manager',
  'email-verification', 'email-verified', 'email-verification-error',
  'resend-verification', 'forgot-password', 'reset-password',
  'test-email', 'test-inscription', 'detail', 'boutique', 'managers',
  'api', '_app', '_document', 'favicon.ico',
  'commandes', 'personnalisation', 'statistiques', 'vendre',
  'campaigns', 'orders', 'products', 'schools', 'settings', 'analytics',
  'admin', 'app', 'www', 'mail', 'ftp', 'localhost', 'about', 'contact',
  'help', 'support', 'terms', 'privacy', 'legal', 'blog', 'news',
  'shop', 'store', 'stores', 'product', 'products', 'cart', 'checkout',
  'account', 'profile', 'settings', 'login', 'logout', 'signup', 'signin',
  'register', 'user', 'users', 'campaign', 'campaigns', 'school', 'schools',
  'order', 'orders', 'student', 'students', 'manager', 'managers'
];

const StoreSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  name: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true }, // Unique slug for URL, sparse allows nulls
  description: { type: String, default: "🎉 Profitez de nos produits exclusifs ainsi que d'un choix de délicieuses tartes pour les fêtes ! Économisez plus en achetant plus : 5 % de rabais dès 6 produits. Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et récupérez facilement vos produits. 🙏 Merci pour votre générosité !" },
  colorPalette: { type: String },
  autoDeposit: { type: Boolean, required: true },
  hoursAvailable: { type: String, default: "18h-20h" },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  discountEnabled: { type: Boolean, default: true }, // Toggle for discount activation
  deliveryOptions: {
    type: [{
      name: { type: String, required: true },
      enabled: { type: Boolean, default: false },
      pickupAddress: { type: String, default: '' }, // For "Pickup (chez moi)"
      deliveryRadius: { type: String, default: '' }   // For "Livraison (si près de chez moi)"
    }],
    default: [
      { name: 'Travail', enabled: false },
      { name: 'Livraison (si près de chez moi)', enabled: false, deliveryRadius: '' },
      { name: 'Pickup (chez moi)', enabled: false, pickupAddress: '' },
      { name: 'Autre', enabled: true } // Only "Autre" enabled by default
    ]
  }, // Options de livraison disponibles avec configuration
});

// Compound index to ensure one store per user per campaign
StoreSchema.index({ user: 1, campaignId: 1 }, { unique: true });



StoreSchema.pre('save', async function (next) {
  if (this.isNew) {
    const user = await User.findById(this.user);
    if (user && this.name === undefined) {
      this.name = `Campagne de ${user.name}`;
    }
  }

  // Migrate deliveryOptions from old format (strings) to new format (objects)
  if (this.deliveryOptions && Array.isArray(this.deliveryOptions) && this.deliveryOptions.length > 0) {
    // Check if first element is a string (old format)
    if (typeof this.deliveryOptions[0] === 'string') {
      // Migrate from strings to objects - keep existing enabled state for old stores
      const migrationMap = {
        'Travail': { name: 'Travail', enabled: true },
        'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
        'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
        'Autre': { name: 'Autre', enabled: true }
      };

      this.deliveryOptions = this.deliveryOptions.map(option => {
        if (typeof option === 'string') {
          return migrationMap[option] || { name: option, enabled: true };
        }
        return option; // Already in new format
      });
    }

    // Ensure "Autre" is always present and enabled
    const hasAutre = this.deliveryOptions.some(opt => {
      const name = typeof opt === 'string' ? opt : opt.name;
      return name === 'Autre';
    });

    if (!hasAutre) {
      this.deliveryOptions.push({ name: 'Autre', enabled: true });
    } else {
      // Ensure "Autre" is enabled
      this.deliveryOptions = this.deliveryOptions.map(opt => {
        const name = typeof opt === 'string' ? opt : opt.name;
        if (name === 'Autre') {
          return typeof opt === 'string' ? { name: 'Autre', enabled: true } : { ...opt, enabled: true };
        }
        return opt;
      });
    }

    // Ensure all options have required fields
    this.deliveryOptions = this.deliveryOptions.map(opt => {
      if (typeof opt === 'string') {
        // Shouldn't happen after migration, but handle it anyway
        const migrationMap = {
          'Travail': { name: 'Travail', enabled: true },
          'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
          'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
          'Autre': { name: 'Autre', enabled: true }
        };
        return migrationMap[opt] || { name: opt, enabled: true };
      }

      // Ensure all required fields are present
      if (!opt || !opt.name) {
        console.warn('Invalid delivery option in pre-save hook:', opt);
        return null; // Will be filtered out
      }

      const name = opt.name;
      const enabled = opt.enabled !== undefined ? opt.enabled : true;
      const pickupAddress = name === 'Pickup (chez moi)' ? (opt.pickupAddress || '') : '';
      const deliveryRadius = name === 'Livraison (si près de chez moi)' ? (opt.deliveryRadius || '') : '';

      return {
        name,
        enabled,
        pickupAddress,
        deliveryRadius
      };
    }).filter(Boolean); // Remove null entries

    // Ensure we have at least default options (only Autre enabled for new stores)
    if (this.deliveryOptions.length === 0) {
      this.deliveryOptions = [
        { name: 'Travail', enabled: false },
        { name: 'Livraison (si près de chez moi)', enabled: false, deliveryRadius: '' },
        { name: 'Pickup (chez moi)', enabled: false, pickupAddress: '' },
        { name: 'Autre', enabled: true }
      ];
    }
  } else if (!this.deliveryOptions || !Array.isArray(this.deliveryOptions) || this.deliveryOptions.length === 0) {
    // Set default options if not set (only Autre enabled for new stores)
    this.deliveryOptions = [
      { name: 'Travail', enabled: false },
      { name: 'Livraison (si près de chez moi)', enabled: false, deliveryRadius: '' },
      { name: 'Pickup (chez moi)', enabled: false, pickupAddress: '' },
      { name: 'Autre', enabled: true }
    ];
  }

  // Always auto-generate slug if not set
  if (!this.slug) {
    const user = await User.findById(this.user).lean();
    if (user) {
      const baseSlug = generateSlug(user.name);
      const Store = mongoose.model('Store');
      let slug = baseSlug;
      let counter = 1;

      // Check if slug already exists (excluding current store) or is reserved
      // Keep checking until we find a unique slug
      while (
        await Store.findOne({ slug, _id: { $ne: this._id } }) ||
        RESERVED_ROUTES.includes(slug)
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      this.slug = slug;
    }
  }

  next();
});

// Pre-save hook to sanitize string fields to ensure valid UTF-8
StoreSchema.pre('save', function (next) {
  // Sanitize top-level string fields
  const topLevelFields = ['name', 'slug', 'description', 'colorPalette', 'hoursAvailable'];

  for (const field of topLevelFields) {
    if (this[field] && typeof this[field] === 'string') {
      try {
        this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
      } catch (e) {
        console.error(`Error encoding Store.${field}:`, e);
        this[field] = '';
      }
    }
  }

  // Sanitize deliveryOptions array
  if (this.deliveryOptions && Array.isArray(this.deliveryOptions)) {
    for (const option of this.deliveryOptions) {
      if (option && typeof option === 'object') {
        if (option.name && typeof option.name === 'string') {
          try {
            option.name = Buffer.from(option.name, 'utf8').toString('utf8');
          } catch (e) {
            console.error(`Error encoding Store.deliveryOptions.name:`, e);
            option.name = '';
          }
        }
        if (option.pickupAddress && typeof option.pickupAddress === 'string') {
          try {
            option.pickupAddress = Buffer.from(option.pickupAddress, 'utf8').toString('utf8');
          } catch (e) {
            console.error(`Error encoding Store.deliveryOptions.pickupAddress:`, e);
            option.pickupAddress = '';
          }
        }
        if (option.deliveryRadius && typeof option.deliveryRadius === 'string') {
          try {
            option.deliveryRadius = Buffer.from(option.deliveryRadius, 'utf8').toString('utf8');
          } catch (e) {
            console.error(`Error encoding Store.deliveryOptions.deliveryRadius:`, e);
            option.deliveryRadius = '';
          }
        }
      }
    }
  }

  next();
});

export default mongoose.models.Store || mongoose.model('Store', StoreSchema);