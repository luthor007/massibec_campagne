// src/models/Store.js
import mongoose from 'mongoose';
import User from './User'; // Ensure you import the User model
import { type } from 'os';

const StoreSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: "🎉 Profitez des pâtés exclusifs de Massibec (viande et poulet) ainsi que d’un choix de délicieuses tartes pour les fêtes ! Économisez plus en achetant plus : 5 % de rabais dès 6 produits et 10 % de rabais dès 12 produits. Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et récupérez facilement vos produits. 🙏 Merci pour votre générosité !" },
  colorPalette: { type: String },
  autoDeposit: { type: Boolean, required: true},
  hoursAvailable: {type: String, default: "18h-20h" },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
});



StoreSchema.pre('save', async function(next) {
  if (this.isNew) {
    const user = await User.findById(this.user);
    if (user && this.name === undefined) {
      this.name = `Campagne de ${user.name}`;
    }
  }
  next();
});


export default mongoose.models.Store || mongoose.model('Store', StoreSchema);