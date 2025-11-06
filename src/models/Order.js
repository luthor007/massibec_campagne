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
  status: { type: String, enum: ['En attente', 'Payé', 'Commander', 'Complété'], default: 'En attente' },
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
});

// Keep orderId compatible with TS pre-save
OrderSchema.pre('save', function (next) {
  if (!this.orderId) {
    // Fallback simple ID if TS nanoid pre-save isn't in effect
    this.orderId = Math.random().toString(36).slice(2, 12);
  }
  next();
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
