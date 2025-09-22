// types/product.ts

import { Types } from 'mongoose';

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  price: number;
  description?: string;
  // Ajoutez d'autres champs nécessaires
}