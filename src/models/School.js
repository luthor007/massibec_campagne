import mongoose from 'mongoose';

const BonusSchema = new mongoose.Schema({
  salesRange: { type: String, required: true }, // Sales range like "200 - 499"
  bonusPerTart: { type: Number, required: true }, // Bonus per tart
  totalBonusRange: { type: String, required: true }, // Total possible bonus range
});

const CampaignSchema = new mongoose.Schema({
  campaignNumber: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  deliveryDate: { type: Date },
  isActive: { type: Boolean, default: false },
  notes: { type: String },
}, { timestamps: true });

const SchoolSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, default: () => Math.floor(Math.random() * 900000) + 100000 }, // Random 6 numbers code
  name: { type: String, required: true, unique: true },
  address: { type: String, required: true, unique: true },
  objectifFinancier: { type: String, required: true },
  debutCampagne: { type: Date, required: true },
  orderCounter: { type: Number, default: 0 }, // Initialize counter to 0
  finCampagne: { type: Date, required: true },
  dateDeLivraison: { type: Date, required: true },
  currentCampaignNumber: { type: Number, default: 1 },
  campaigns: { type: [CampaignSchema], default: [] },
  activeCampaignId: { type: mongoose.Schema.Types.ObjectId, default: null },
  telephone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  approved: { type: Boolean, required: true, default: false },
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
  accumba: { type: String },
  expNum: { type: String },
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} }
});

SchoolSchema.pre('save', function syncActiveCampaign(next) {
  if (!this.campaigns || this.campaigns.length === 0) {
    return next();
  }

  let activeCampaign = this.campaigns.find((campaign) => campaign.isActive);

  if (!activeCampaign) {
    activeCampaign = this.campaigns[0];
    activeCampaign.isActive = true;
  }

  const activeId = activeCampaign._id?.toString();

  this.campaigns.forEach((campaign) => {
    const isActive = campaign._id?.toString() === activeId;
    campaign.isActive = isActive;
    if (isActive) {
      activeCampaign = campaign;
    }
  });

  this.activeCampaignId = activeCampaign._id;
  this.currentCampaignNumber = activeCampaign.campaignNumber;
  this.debutCampagne = activeCampaign.startDate;
  this.finCampagne = activeCampaign.endDate;
  this.dateDeLivraison = activeCampaign.deliveryDate;

  next();
});

export default mongoose.models.School || mongoose.model('School', SchoolSchema);
