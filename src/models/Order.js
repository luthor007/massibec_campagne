// src/models/Order.js
import mongoose from 'mongoose';

// This JS schema mirrors src/models/Order.ts exactly
const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  school: { type: String, required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, default: null },
  campaignNumber: { type: Number, default: null },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    productName: { type: String, required: true },
    productCost: { type: Number, required: true },
    productPrice: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  status: { type: String, enum: ['En attente', 'Payé', 'Commandé', 'Complété'], default: 'En attente' },
  createdAt: { type: Date, default: Date.now },
  orderId: { type: String },
  studentDonation: { type: Number, default: 0 },
  schoolDonation: { type: Number, default: 0 },
  studentDonationSplit: {
    studentAccount: { type: Number, default: 0 },
    studentCash: { type: Number, default: 0 }
  },
  // Legacy field kept for backward compatibility
  tip: { type: Number },
  tipBreakdown: {
    studentCash: { type: Number, default: 0 },
    studentSchoolAccount: { type: Number, default: 0 },
    schoolProject: { type: Number, default: 0 }
  },
  discount: { type: Number },
  isTest: { type: Boolean, default: false }, // Flag to mark test orders from pending campaigns
  distributionNotes: { type: String, default: '' }, // Notes for distribution (e.g., "chez moi", "travail", "livraison")
  deliveryOption: { type: String, default: '' }, // Option de livraison choisie (e.g., "Travail", "Pickup (chez moi)")
  customDeliveryOption: { type: String, default: '' }, // Option personnalisée si "Autre" est sélectionné
  customerDeliveryAddress: { type: String, default: '' }, // Adresse du client pour livraison
  paymentMethod: { type: String, enum: ['interac', 'cash'], default: 'interac' }, // Méthode de paiement: 'interac' ou 'cash' (argent comptant)
});

// Keep orderId compatible with TS pre-save
OrderSchema.pre('save', function (next) {
  if (!this.orderId) {
    // Fallback simple ID if TS nanoid pre-save isn't in effect
    this.orderId = Math.random().toString(36).slice(2, 12);
  }
  next();
});

// Pre-save hook to sanitize string fields to ensure valid UTF-8
OrderSchema.pre('save', function (next) {
  const stringFields = [
    'school', 'status', 'orderId',
    'customerName', 'customerEmail', 'phoneNumber',
    'distributionNotes', 'deliveryOption', 'customDeliveryOption', 'customerDeliveryAddress'
  ];

  // Sanitize top-level string fields
  for (const field of stringFields) {
    if (this[field] && typeof this[field] === 'string') {
      try {
        this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
      } catch (e) {
        console.error(`Error encoding Order.${field}:`, e);
        this[field] = '';
      }
    }
  }

  // Sanitize products array
  if (this.products && Array.isArray(this.products)) {
    for (const product of this.products) {
      if (product.productName && typeof product.productName === 'string') {
        try {
          product.productName = Buffer.from(product.productName, 'utf8').toString('utf8');
        } catch (e) {
          console.error(`Error encoding Order.products.productName:`, e);
          product.productName = '';
        }
      }
    }
  }

  next();
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
