import mongoose from 'mongoose';
import School from './School.js'

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'school_manager', 'supplier', 'admin', 'distributor'], required: true }, // Define role


  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  orderCounter: { type: Number, default: 0 }, // Initialize counter to 0


  // Fields for students - Legacy field (keep for backward compatibility)
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: School,
    required: false, // Make optional for new multi-campaign system
  },

  // New multi-campaign fields
  campaigns: [{
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    groupId: { type: String }, // Group name from campaign.groups.list
    joinedAt: { type: Date, default: Date.now },
    objectifPersonnel: { type: Number },
    isActive: { type: Boolean, default: true }
  }],

  activeCampaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  // Legacy objectifPersonnel field (keep for backward compatibility)
  objectifPersonnel: {
    type: Number,
    required: false, // Make optional for new multi-campaign system
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
  },
  verificationTokenExpires: {
    type: Date,
  },
  loginToken: {
    type: String,
  },
  loginTokenExpires: {
    type: Date,
  },
  loginTokenUsed: {
    type: Number,
    default: 0,
  },
  originalPasswordHash: {
    type: String,
    // Temporary field to store original password hash when testing
    // This field should be cleared after restoring the password
  },
  profileCompleted: { type: Boolean, default: false },
  profileCompletionPercentage: { type: Number, default: 0 },
  // parentInfo is now optional for students (simplified registration)
  // Fields can be completed later in profile settings
  parentInfo: {
    nomParent: { type: String }, // Optional - can be completed later
    prenomParent: { type: String }, // Optional - can be completed later
    // Address fields removed - not needed as delivery is always at school
    adresse: { type: String }, // Optional, kept for backward compatibility
    app: { type: String }, // Optional
    ville: { type: String }, // Optional, kept for backward compatibility
    province: { type: String }, // Optional
    codePostal: { type: String }, // Optional
    telephone: { type: String }, // Optional - can be completed later
  },

  // Fields for school managers
  //schoolManaged: {
  //  type: String,
  //  required: function () {
  //    return this.role === 'school_manager';
  //  },
  //},
  schoolManagerInfo: {
    titreOuFonction: { type: String, required: function () { return this.role === 'school_manager'; } },
    organisme: { type: mongoose.Schema.Types.ObjectId, ref: School, required: function () { return this.role === 'school_manager'; } },
    ville: { type: String, required: function () { return this.role === 'school_manager'; } },
    codePostal: { type: String, required: function () { return this.role === 'school_manager'; } },
    telephone: { type: String, required: function () { return this.role === 'school_manager'; } },
    cellulaire: { type: String }
  },
  // Fields for supplier managers
  supplierManagerInfo: {
    titreOuFonction: { type: String, required: function () { return this.role === 'supplier'; } },
    organisme: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: function () { return this.role === 'supplier'; } },
    ville: { type: String, required: function () { return this.role === 'supplier'; } },
    codePostal: { type: String, required: function () { return this.role === 'supplier'; } },
    telephone: { type: String, required: function () { return this.role === 'supplier'; } },
    cellulaire: { type: String },
    momentPourJoindre: { type: String, required: function () { return this.role === 'supplier'; } }
  },
  // Fields for distributors
  distributorInfo: {
    nomEntreprise: { type: String },
    telephone: { type: String },
    adresse: { type: String },
    ville: { type: String },
    codePostal: { type: String }
  },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },

  // Student photo for marketing materials (poster/flyer)
  studentPhoto: { type: String }, // URL to Cloudinary image

  // Onboarding progress tracking
  onboardingProgress: {
    joinedCampaign: { type: Boolean, default: false },
    personalizedStore: { type: Boolean, default: false },
    visitedStore: { type: Boolean, default: false },
    viewedOrders: { type: Boolean, default: false },
    viewedStats: { type: Boolean, default: false },
    viewedTools: { type: Boolean, default: false },
    completedAt: { type: Date }
  },
  // Supplier onboarding progress tracking
  supplierOnboardingProgress: {
    productCatalog: { type: Boolean, default: false },
    settings: { type: Boolean, default: false },
    completedAt: { type: Date }
  }
});

// Ensure that role-specific fields are valid
UserSchema.path('role').validate(function (value) {
  if (value === 'admin') {
    // Admin role doesn't require role-specific fields
    return true;
  }
  if (value === 'student') {
    // For students, parentInfo is now optional (simplified registration)
    // Only email, name, and password are required at registration
    return true;
  }
  if (value === 'school_manager') {
    return !!this.schoolManagerInfo &&
      !!this.schoolManagerInfo.titreOuFonction &&
      !!this.schoolManagerInfo.organisme;
  }
  if (value === 'supplier') {
    return !!this.supplierManagerInfo &&
      !!this.supplierManagerInfo.titreOuFonction &&
      !!this.supplierManagerInfo.organisme;
  }
  if (value === 'distributor') {
    // Distributor role doesn't require strict validation for now
    // We can add more requirements later if needed
    return true;
  }
  return false;
}, 'Invalid role requirements');

// Pre-save hook to sanitize string fields to ensure valid UTF-8
UserSchema.pre('save', function (next) {
  const stringFields = [
    'email', 'name', 'role',
    'verificationToken', 'loginToken', 'originalPasswordHash',
    'studentPhoto',
    // parentInfo fields
    'parentInfo.nomParent', 'parentInfo.prenomParent', 'parentInfo.adresse',
    'parentInfo.app', 'parentInfo.ville', 'parentInfo.province', 'parentInfo.codePostal', 'parentInfo.telephone',
    // schoolManagerInfo fields
    'schoolManagerInfo.titreOuFonction', 'schoolManagerInfo.ville',
    'schoolManagerInfo.codePostal', 'schoolManagerInfo.telephone', 'schoolManagerInfo.cellulaire',
    // supplierManagerInfo fields
    'supplierManagerInfo.titreOuFonction', 'supplierManagerInfo.ville',
    'supplierManagerInfo.codePostal', 'supplierManagerInfo.telephone',
    'supplierManagerInfo.cellulaire', 'supplierManagerInfo.momentPourJoindre',
    // distributorInfo fields
    'distributorInfo.nomEntreprise', 'distributorInfo.telephone',
    'distributorInfo.adresse', 'distributorInfo.ville', 'distributorInfo.codePostal'
  ];

  // Sanitize top-level string fields
  for (const field of ['email', 'name', 'role', 'verificationToken', 'loginToken', 'originalPasswordHash', 'studentPhoto']) {
    if (this[field] && typeof this[field] === 'string') {
      try {
        this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
      } catch (e) {
        console.error(`Error encoding User.${field}:`, e);
        this[field] = '';
      }
    }
  }

  // Sanitize nested object fields
  if (this.parentInfo) {
    const parentFields = ['nomParent', 'prenomParent', 'adresse', 'app', 'ville', 'province', 'codePostal', 'telephone'];
    for (const field of parentFields) {
      if (this.parentInfo[field] && typeof this.parentInfo[field] === 'string') {
        try {
          this.parentInfo[field] = Buffer.from(this.parentInfo[field], 'utf8').toString('utf8');
        } catch (e) {
          console.error(`Error encoding User.parentInfo.${field}:`, e);
          this.parentInfo[field] = '';
        }
      }
    }
  }

  if (this.schoolManagerInfo) {
    const managerFields = ['titreOuFonction', 'ville', 'codePostal', 'telephone', 'cellulaire'];
    for (const field of managerFields) {
      if (this.schoolManagerInfo[field] && typeof this.schoolManagerInfo[field] === 'string') {
        try {
          this.schoolManagerInfo[field] = Buffer.from(this.schoolManagerInfo[field], 'utf8').toString('utf8');
        } catch (e) {
          console.error(`Error encoding User.schoolManagerInfo.${field}:`, e);
          this.schoolManagerInfo[field] = '';
        }
      }
    }
  }

  if (this.supplierManagerInfo) {
    const supplierFields = ['titreOuFonction', 'ville', 'codePostal', 'telephone', 'cellulaire', 'momentPourJoindre'];
    for (const field of supplierFields) {
      if (this.supplierManagerInfo[field] && typeof this.supplierManagerInfo[field] === 'string') {
        try {
          this.supplierManagerInfo[field] = Buffer.from(this.supplierManagerInfo[field], 'utf8').toString('utf8');
        } catch (e) {
          console.error(`Error encoding User.supplierManagerInfo.${field}:`, e);
          this.supplierManagerInfo[field] = '';
        }
      }
    }
  }

  if (this.distributorInfo) {
    const distributorFields = ['nomEntreprise', 'telephone', 'adresse', 'ville', 'codePostal'];
    for (const field of distributorFields) {
      if (this.distributorInfo[field] && typeof this.distributorInfo[field] === 'string') {
        try {
          this.distributorInfo[field] = Buffer.from(this.distributorInfo[field], 'utf8').toString('utf8');
        } catch (e) {
          console.error(`Error encoding User.distributorInfo.${field}:`, e);
          this.distributorInfo[field] = '';
        }
      }
    }
  }

  next();
});

export default mongoose.models.User || mongoose.model('User', UserSchema);