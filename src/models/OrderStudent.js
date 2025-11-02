// models/OrderStudent.js

import mongoose from 'mongoose';
import School from './School.js'

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
    studentCashBenefit: { type: Number, required: true }, // Bénéfice étudiant comptant
    studentSchoolAccountBenefit: { type: Number, required: true }, // Bénéfice étudiant compte scolaire
    schoolProjectBenefit: { type: Number, required: true }, // Bénéfice projet école
    raffleBenefit: { type: Number, required: true }, // Bénéfice pour le tirage
    // Legacy fields for backward compatibility
    studentBenefit: { type: Number }, // Bénéfice pour l'élève (legacy)
    organizationBenefit: { type: Number }, // Bénéfice pour l'organisation (legacy)
  }], // Liste des produits
  totalUnits: { type: Number, required: true }, // Total d'unités
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, required: true }, // Montant payé
  orderId: { type: Number, unique: true }, // ID de commande unique
  transferAmount: { type: Number }, // Transfert Interac effectué au montant de
  studentCashBenefit: { type: Number, required: true }, // Bénéfice étudiant comptant total
  studentSchoolAccountBenefit: { type: Number, required: true }, // Bénéfice étudiant compte scolaire total
  schoolProjectBenefit: { type: Number, required: true }, // Bénéfice projet école total
  raffleBenefit: { type: Number, required: true }, // Bénéfice pour le tirage total
  bonusOrganization: { type: Number }, // Bonus pour l'organisation et cadeaux aux vendeurs
  tip: { type: Number, default: 0 }, // Donation amount
  tipBreakdown: {
    studentCash: { type: Number, default: 0 },
    studentSchoolAccount: { type: Number, default: 0 },
    schoolProject: { type: Number, default: 0 }
  },
  // Legacy fields for backward compatibility
  studentBenefit: { type: Number }, // Bénéfice pour l'élève (legacy)
  organizationBenefit: { type: Number }, // Bénéfice pour l'organisation (legacy)
  isTest: { type: Boolean, default: false }, // Flag to mark test orders from pending campaigns
  createdAt: { type: Date, default: Date.now },
});

// Ajouter un index unique sur orderId si ce n'est pas déjà fait
OrderStudentSchema.index({ orderId: 1 }, { unique: true });

export default mongoose.models.OrderStudent || mongoose.model('OrderStudent', OrderStudentSchema);
