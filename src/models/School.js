import mongoose from 'mongoose';

const BonusSchema = new mongoose.Schema({
  salesRange: { type: String, required: true }, // Sales range like "200 - 499"
  bonusPerTart: { type: Number, required: true }, // Bonus per tart
  totalBonusRange: { type: String, required: true }, // Total possible bonus range
});


const SchoolSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, default: () => Math.floor(Math.random() * 900000) + 100000 }, // Random 6 numbers code
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 200,
    validate: {
      validator: function (v) {
        return v && typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 200;
      },
      message: 'School name must be a non-empty string between 1 and 200 characters'
    }
  },
  address: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 200
  },
  ville: { type: String, trim: true, maxlength: 100 },
  codePostal: { type: String, trim: true, maxlength: 20 },
  telephone: { type: String, trim: true, maxlength: 50 }, // Téléphone de l'école
  email: { type: String, trim: true, maxlength: 100 }, // Email de l'école
  logo: { type: String, maxlength: 500 }, // Logo filename
  organizationType: {
    type: String,
    enum: ['school', 'sport_team', 'community_org', 'other'],
    default: 'school',
    required: true
  }, // Type d'organisation
  numberOfStudents: { type: Number, min: 0 }, // Nombre de participants (étudiants/membres)
  orderCounter: { type: Number, default: 0 }, // Initialize counter to 0
  currentCampaignNumber: { type: Number, default: 0 }, // Start with 0 campaigns
  activeCampaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  approved: { type: Boolean, required: true, default: true }, // Auto-approved by default
  profileCompleted: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'deactivated'],
    default: 'approved' // Auto-approved by default
  },
  rejectionReason: { type: String, trim: true, maxlength: 500 },
  rejectedAt: { type: Date },
  deactivationReason: { type: String, trim: true, maxlength: 500 },
  deactivatedAt: { type: Date },
  reactivatedAt: { type: Date },
  split: {
    studentBenefit: { type: Number, default: 85.6 }, // Pourcentage de bénéfice pour l'étudiant
    organizationBenefit: { type: Number, default: 9.4 }, // Pourcentage de bénéfice pour l'organisation
    raffleBenefit: { type: Number, default: 5.0 }, // Pourcentage de bénéfice pour le tirage
  },
  isBonus: { type: Boolean, default: false },
  bonuses: {
    type: [BonusSchema],
    default: [
      { salesRange: "200 - 499", bonusPerTart: 0.30, totalBonusRange: "60.00$ - 149.70$" },
      { salesRange: "500 - 999", bonusPerTart: 0.31, totalBonusRange: "155.00$ - 309.69$" },
      { salesRange: "1000 - 1499", bonusPerTart: 0.32, totalBonusRange: "320.00$ - 479.68$" },
      { salesRange: "1500 - 1999", bonusPerTart: 0.33, totalBonusRange: "495.00$ - 659.67$" },
      { salesRange: "2000 - 2999", bonusPerTart: 0.34, totalBonusRange: "680.00$ - 1019.66$" },
      { salesRange: "3000 - 3999", bonusPerTart: 0.35, totalBonusRange: "1050.00$ - 1399.65$" },
      { salesRange: "4000 - 4999", bonusPerTart: 0.37, totalBonusRange: "1480.00$ - 1849.63$" },
      { salesRange: "5000 - 5999", bonusPerTart: 0.39, totalBonusRange: "1950.00$ - 2339.61$" },
      { salesRange: "6000 - 6999", bonusPerTart: 0.42, totalBonusRange: "2520.00$ - 2939.58$" },
      { salesRange: "7000 - +++", bonusPerTart: 0.45, totalBonusRange: "3150.00$ - +++" },
    ],
  },
  accumba: { type: String, trim: true, maxlength: 200 },
  expNum: { type: String, trim: true, maxlength: 200 },
  deliveryInstructions: { type: String, default: '', trim: true, maxlength: 1000 }, // Instructions pour le livreur
  preferredPaymentMethod: { type: String, enum: ['cheque', 'virement'], default: null }, // Moyen de paiement préféré
  paymentInfo: {
    chequeSpecimen: { type: String, maxlength: 500 } // URL to uploaded cheque specimen image
  },
  distributionLocation: { type: String, trim: true, maxlength: 500 }, // Endroit précis où se fera la distribution
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  // Add collection-level encoding safety
  versionKey: false,
  minimize: true
});

// Ensure all string fields are properly encoded
SchoolSchema.pre('save', function (next) {
  // Sanitize string fields to ensure valid UTF-8
  const stringFields = ['name', 'address', 'ville', 'codePostal', 'telephone', 'email',
    'logo', 'rejectionReason', 'deactivationReason', 'deliveryInstructions',
    'accumba', 'expNum', 'distributionLocation', 'organizationType'];

  for (const field of stringFields) {
    if (this[field] && typeof this[field] === 'string') {
      try {
        // Convert to UTF-8 safely
        this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
      } catch (e) {
        console.error(`Error encoding ${field}:`, e);
        this[field] = '';
      }
    }
  }

  next();
});

export default mongoose.models.School || mongoose.model('School', SchoolSchema);
