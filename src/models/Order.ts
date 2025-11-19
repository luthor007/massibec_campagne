// models/Order.ts

import mongoose, { Schema, Document } from 'mongoose';
import Product from './Product';
import { nanoid } from 'nanoid';
import { IStore } from '../types/store';
import { IProduct } from '../types/product';


export interface IProductItem {
  product: mongoose.Types.ObjectId | IProduct;
  quantity: number;
  productName?: string; // Optionnel, utilisé pour l'e-mail
  productPrice?: number;
  productCost?: number;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId; // Propriétaire de la boutique
  store: mongoose.Types.ObjectId; // Référence à la boutique
  school: string;
  campaignId?: mongoose.Types.ObjectId;
  campaignNumber?: number;
  products: IProductItem[];
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  phoneNumber: string;
  status: 'En attente' | 'Payé' | 'Commandé' | 'Complété';
  createdAt: Date;
  orderId: string;
  tip?: number;
  discount?: number;
  deliveryOption?: string; // Option de livraison choisie
  customDeliveryOption?: string; // Option personnalisée si "Autre" est sélectionné
  customerDeliveryAddress?: string; // Adresse du client pour livraison
}

const OrderSchema: Schema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  school: { type: String, required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, default: null },
  campaignNumber: { type: Number, default: null },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: Product, required: true },
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
  tip: { type: Number },
  discount: { type: Number },
  deliveryOption: { type: String, default: '' },
  customDeliveryOption: { type: String, default: '' },
  customerDeliveryAddress: { type: String, default: '' },
});

// Générer un orderId unique avant de sauvegarder le document et sanitizer UTF-8
OrderSchema.pre<IOrder>('save', function (next) {
  if (!this.orderId) {
    this.orderId = nanoid(10); // Génère une chaîne unique de 10 caractères
  }

  // Sanitize all string fields to ensure valid UTF-8 encoding
  // This prevents "Invalid UTF-8 string in BSON document" errors
  const sanitizeString = (str: any): string => {
    if (!str || typeof str !== 'string') return str;
    try {
      // Try to validate and fix UTF-8 encoding
      return Buffer.from(str, 'utf8').toString('utf8');
    } catch (error) {
      // If invalid UTF-8, try to fix it by converting from latin1
      try {
        return Buffer.from(str, 'latin1').toString('utf8');
      } catch {
        // Last resort: remove invalid characters
        return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
      }
    }
  };

  // Sanitize all string fields
  if (this.customerName) this.customerName = sanitizeString(this.customerName);
  if (this.customerEmail) this.customerEmail = sanitizeString(this.customerEmail);
  if (this.phoneNumber) this.phoneNumber = sanitizeString(this.phoneNumber);
  if (this.school && typeof this.school === 'string') this.school = sanitizeString(this.school);
  if (this.deliveryOption) this.deliveryOption = sanitizeString(this.deliveryOption);
  if (this.customDeliveryOption) this.customDeliveryOption = sanitizeString(this.customDeliveryOption);
  if (this.customerDeliveryAddress) this.customerDeliveryAddress = sanitizeString(this.customerDeliveryAddress);
  if (this.status) this.status = sanitizeString(this.status) as 'En attente' | 'Payé' | 'Commandé' | 'Complété';
  if (this.orderId) this.orderId = sanitizeString(this.orderId);

  // Sanitize product names in products array
  if (this.products && Array.isArray(this.products)) {
    this.products.forEach(product => {
      if (product.productName) {
        product.productName = sanitizeString(product.productName);
      }
    });
  }

  next();
});

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
