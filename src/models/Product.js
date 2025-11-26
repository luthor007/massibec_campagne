// src/models/Product.js
import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    validate: {
      validator: function (v) {
        return v && typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 200;
      },
      message: 'Product name must be a non-empty string between 1 and 200 characters'
    }
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  // Prix pickup à l'usine (entré par le fournisseur)
  pricePickup: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function (v) {
        return !isNaN(v) && v >= 0;
      },
      message: 'Price pickup must be a valid number >= 0'
    }
  },
  // Prix de vente à l'école (calculé automatiquement: pricePickup * markup + deliveryCostToSchool, arrondi au multiple de 5 cent le plus bas)
  // IMPORTANT: Ce champ stocke le PRIX ARRONDI qui est la source de vérité pour tous les calculs
  // Tous les calculs de coût d'acquisition pour l'école doivent utiliser ce champ directement
  price: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function (v) {
        return !isNaN(v) && v >= 0;
      },
      message: 'Price must be a valid number >= 0'
    }
  },
  // Coût de livraison à l'école calculé automatiquement (basé sur devis DMB)
  deliveryCostToSchool: {
    type: Number,
    default: 0,
    min: 0
  },
  // Livraison directe au consommateur activée (hérite du supplier si activé globalement)
  directToConsumerEnabled: {
    type: Boolean,
    default: false
  },
  // Prix conseillé de revente (pour calculer la marge élève/école)
  recommendedRetailPrice: {
    type: Number,
    required: false,
    min: 0,
    validate: {
      validator: function (v) {
        return v === undefined || v === null || (!isNaN(v) && v >= 0);
      },
      message: 'Recommended retail price must be a valid number >= 0'
    }
  },
  // Coût interne (optionnel, pour référence)
  cost: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
    validate: {
      validator: function (v) {
        return !isNaN(v) && v >= 0;
      },
      message: 'Cost must be a valid number >= 0'
    }
  },
  image: {
    type: String,
    required: true,
    trim: true
  },
  ingredientsImage: {
    type: String,
    trim: true,
    default: ''
  },
  nutritionImage: {
    type: String,
    trim: true,
    default: ''
  },
  productId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: () => Math.floor(Math.random() * 900000) + 100000 // 6-digit number
  },
  isDefault: { type: Boolean, default: false },
  order: {
    type: Number,
    default: 0,
    required: false
  },
  // Attributs du produit
  attributes: {
    freezable: {
      type: Boolean,
      default: false,
      required: false
    },
    glutenFree: {
      type: Boolean,
      default: false,
      required: false
    },
    vegetarian: {
      type: Boolean,
      default: false,
      required: false
    },
    vegan: {
      type: Boolean,
      default: false,
      required: false
    },
    nutFree: {
      type: Boolean,
      default: false,
      required: false
    },
    halal: {
      type: Boolean,
      default: false,
      required: false
    },
    kosher: {
      type: Boolean,
      default: false,
      required: false
    },
    organic: {
      type: Boolean,
      default: false,
      required: false
    },
    quebecProduct: {
      type: Boolean,
      default: false,
      required: false
    },
    allergens: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500
    }
  },
  // Supplier reference - products are supplier-specific
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  // Logistical information
  unitSize: {
    type: String,
    trim: true,
    maxlength: 50
  },
  casePack: {
    type: String,
    trim: true,
    maxlength: 100
  },
  pallet: {
    ti: { type: Number, default: 0 }, // Tiers (layers)
    hi: { type: Number, default: 0 }  // Hauteur (height)
  },
  refrigerated: {
    type: Boolean,
    default: false
  },
  // Grouping for packaging - products with same shape/size can be packed together
  packagingGroup: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  category: {
    type: String,
    trim: true,
    maxlength: 100
  },
  ingredientsText: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  nutritionText: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  sourceUrl: {
    type: String,
    trim: true,
    maxlength: 500
  },
  priceFinal: {
    type: Number,
    min: 0
  },
}, {
  // Add collection-level encoding safety
  versionKey: false,
  minimize: false, // Set to false to ensure nested objects like attributes are saved
  timestamps: true // Enable createdAt and updatedAt
});

// Ensure all string fields are properly encoded
ProductSchema.pre('save', function (next) {
  // NOTE: This pre-save hook is a fallback. The APIs should calculate price correctly before saving.
  // If pricePickup is set and price is not explicitly set, calculate it as fallback
  // IMPORTANT: Price must be rounded down to nearest 5 cents (Math.floor(value * 20) / 20)
  // This ensures product.price is always the rounded price (source of truth)
  if (this.pricePickup !== undefined && this.pricePickup !== null && this.pricePickup > 0) {
    if (!this.isModified('price') || this.price === undefined || this.price === null) {
      // Fallback calculation (APIs should handle this with dynamic markup)
      const basePrice = this.pricePickup * 1.05; // Default 5% markup (APIs use dynamic markup)
      const deliveryCost = this.deliveryCostToSchool || 0;
      const totalPrice = basePrice + deliveryCost;
      // Round down to nearest 5 cents - this is the REAL price for schools
      this.price = Math.floor(totalPrice * 20) / 20;
    } else {
      // If price is already set, ensure it's rounded to nearest 5 cents
      // This ensures consistency even if price was set manually
      this.price = Math.floor(this.price * 20) / 20;
    }
  } else if (this.price !== undefined && this.price !== null) {
    // Ensure existing price is rounded to nearest 5 cents
    this.price = Math.floor(this.price * 20) / 20;
  }

  // Migrate old format (freezable at root) to new format (attributes object)
  if (this.freezable !== undefined && (!this.attributes || this.attributes.freezable === undefined)) {
    if (!this.attributes) {
      this.attributes = {};
    }
    this.attributes.freezable = this.freezable;
    // Don't delete this.freezable to maintain backward compatibility
  }

  // Ensure attributes object exists with defaults
  if (!this.attributes) {
    this.attributes = {
      freezable: false,
      glutenFree: false,
      vegetarian: false,
      vegan: false,
      nutFree: false,
      halal: false,
      kosher: false,
      organic: false,
      quebecProduct: false,
      allergens: ''
    };
  }

  // Sanitize string fields to ensure valid UTF-8
  if (this.name && typeof this.name === 'string') {
    this.name = Buffer.from(this.name, 'utf8').toString('utf8');
  }
  if (this.description && typeof this.description === 'string') {
    this.description = Buffer.from(this.description, 'utf8').toString('utf8');
  }
  if (this.image && typeof this.image === 'string') {
    this.image = Buffer.from(this.image, 'utf8').toString('utf8');
  }
  if (this.ingredientsImage && typeof this.ingredientsImage === 'string') {
    this.ingredientsImage = Buffer.from(this.ingredientsImage, 'utf8').toString('utf8');
  }
  if (this.nutritionImage && typeof this.nutritionImage === 'string') {
    this.nutritionImage = Buffer.from(this.nutritionImage, 'utf8').toString('utf8');
  }
  if (this.productId && typeof this.productId === 'string') {
    this.productId = Buffer.from(this.productId, 'utf8').toString('utf8');
  }
  if (this.attributes && this.attributes.allergens && typeof this.attributes.allergens === 'string') {
    this.attributes.allergens = Buffer.from(this.attributes.allergens, 'utf8').toString('utf8');
  }
  // Sanitize new logistical fields
  if (this.unitSize && typeof this.unitSize === 'string') {
    this.unitSize = Buffer.from(this.unitSize, 'utf8').toString('utf8');
  }
  if (this.casePack && typeof this.casePack === 'string') {
    this.casePack = Buffer.from(this.casePack, 'utf8').toString('utf8');
  }
  if (this.category && typeof this.category === 'string') {
    this.category = Buffer.from(this.category, 'utf8').toString('utf8');
  }
  if (this.ingredientsText && typeof this.ingredientsText === 'string') {
    this.ingredientsText = Buffer.from(this.ingredientsText, 'utf8').toString('utf8');
  }
  if (this.nutritionText && typeof this.nutritionText === 'string') {
    this.nutritionText = Buffer.from(this.nutritionText, 'utf8').toString('utf8');
  }
  if (this.sourceUrl && typeof this.sourceUrl === 'string') {
    this.sourceUrl = Buffer.from(this.sourceUrl, 'utf8').toString('utf8');
  }
  next();
});

// Export the model to prevent recompilation issues in serverless environments
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
