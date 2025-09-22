// src/models/Product.js
import mongoose from 'mongoose';
import School from './School'

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 1000 },
  price: { type: Number, required: true, min: 0 },
  cost: { type: Number, required: true, min: 0 }, // Added cost field
  image: { type: String, required: true },       // Added image field
  productId: { 
    type: String, 
    required: true,
    unique: true,
    default: () => Math.floor(Math.random() * 900000) + 100000 // 6-digit number
  },
  isDefault: { type: Boolean, default: false },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: School,
    required: true
  },

});

// Export the model to prevent recompilation issues in serverless environments
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);