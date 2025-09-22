// models/Counter.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
  _id: string; // Utilisation de String pour des identifiants personnalisés
  sequence_value: number;
}

const CounterSchema: Schema = new Schema({
  _id: { type: String, required: true }, // _id est une chaîne de caractères
  sequence_value: { type: Number, default: 0 },
});

export default mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);