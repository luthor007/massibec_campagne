// src/models/Product.js
import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 200,
    validate: {
      validator: function(v) {
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
  price: { 
    type: Number, 
    required: true, 
    min: 0,
    validate: {
      validator: function(v) {
        return !isNaN(v) && v >= 0;
      },
      message: 'Price must be a valid number >= 0'
    }
  },
  cost: { 
    type: Number, 
    required: true, 
    min: 0,
    validate: {
      validator: function(v) {
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
  // Supprimé: school - les produits sont universels
}, {
  // Add collection-level encoding safety
  versionKey: false,
  minimize: true,
  timestamps: true // Enable createdAt and updatedAt
});

// Ensure all string fields are properly encoded
ProductSchema.pre('save', function(next) {
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
  if (this.productId && typeof this.productId === 'string') {
    this.productId = Buffer.from(this.productId, 'utf8').toString('utf8');
  }
  next();
});

// Export the model to prevent recompilation issues in serverless environments
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);