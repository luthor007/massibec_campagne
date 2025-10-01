// models/OrderStudent.js

import mongoose from 'mongoose';
import School from './School'

const OrderStudentSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now }, // Horodatage
  email: { type: String, required: true }, // Adresse de courriel
  studentName: { type: String, required: true }, // Prénom et nom de l'élève
  phoneNumber: { type: String, required: true }, // Numéro de téléphone
  school: { type: mongoose.Schema.Types.ObjectId, ref: School, required: true }, // Référence à l'école
  campaignNumber: { type: Number },
  products: [{
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // Prix unitaire
    cost: { type: Number, required: true }, // Coût unitaire
    profit: { type: Number, required: true }, // Profit unitaire
    studentBenefit: { type: Number, required: true }, // Bénéfice pour l'élève
    organizationBenefit: { type: Number, required: true }, // Bénéfice pour l'organisation
    raffleBenefit: { type: Number, required: true }, // Bénéfice pour le tirage
  }], // Liste des produits
  totalUnits: { type: Number, required: true }, // Total d'unités
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, required: true }, // Montant payé
  orderId: { type: Number, unique: true }, // ID de commande unique
  transferAmount: { type: Number }, // Transfert Interac effectué au montant de
  studentBenefit: { type: Number, required: true }, // Bénéfice pour l'élève
  raffleBenefit: { type: Number, required: true }, // Bénéfice pour le tirage
  organizationBenefit: { type: Number, required: true }, // Bénéfice pour l'organisation
  bonusOrganization: { type: Number }, // Bonus pour l'organisation et cadeaux aux vendeurs
  createdAt: { type: Date, default: Date.now },
});

// Ajouter un index unique sur orderId si ce n'est pas déjà fait
OrderStudentSchema.index({ orderId: 1 }, { unique: true });

export default mongoose.models.OrderStudent || mongoose.model('OrderStudent', OrderStudentSchema);
