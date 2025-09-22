// types/order.ts

import { Types } from 'mongoose';
import { IProduct } from './product';

export interface IProductItem {
  product: Types.ObjectId | IProduct; // Référence au produit
  quantity: number;
  productName?: string; // Optionnel, utilisé pour l'e-mail
}

export interface IOrder {
  _id: Types.ObjectId; // ID de la commande (MongoDB _id)
  user: Types.ObjectId; // ID de l'utilisateur (propriétaire de la boutique)
  school: string;
  products: IProductItem[];
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  status: 'En attente' | 'Payer' | 'Commander' | 'Complété';
  createdAt: Date;
  orderId: string;
}