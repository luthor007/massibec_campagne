import mongoose from 'mongoose';

const EdiCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  value: { type: Number, required: true, default: 9000999 }
});

export default mongoose.models.EdiCounter || mongoose.model('EdiCounter', EdiCounterSchema); 