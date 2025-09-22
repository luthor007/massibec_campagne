// src/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  school: {  type: String, enum: ['SSJ', 'Chavigny', 'Estacade'], required: true },
  objectifPersonnel: { type: Number, required: true },
  parentInfo: {
    nomParent: { type: String, required: true },
    prenomParent: { type: String, required: true },
    adresse: { type: String, required: true },
    app: { type: String },
    ville: { type: String, required: true },
    province: { type: String, required: true },
    codePostal: { type: String, required: true },
    telephone: { type: String, required: true },
  },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);