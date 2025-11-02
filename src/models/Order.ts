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
  status: 'En attente' | 'Payé' | 'Commander' | 'Complété';
  createdAt: Date;
  orderId: string;
  tip?: number;
  discount?: number;
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
    productCost: { type: Number, required: true},
    productPrice: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  status: { type: String, enum: ['En attente', 'Payé', 'Commander', 'Complété'], default: 'En attente' },
  createdAt: { type: Date, default: Date.now },
  orderId: { type: String },
  tip: { type: Number},
  discount: { type: Number },
});

// Générer un orderId unique avant de sauvegarder le document
OrderSchema.pre<IOrder>('save', function (next) {
  if (!this.orderId) {
    this.orderId = nanoid(10); // Génère une chaîne unique de 10 caractères
  }
  next();
});

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
