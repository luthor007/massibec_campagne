import mongoose from 'mongoose';
import School from './School.js'

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'school_manager'], required: true }, // Define role


  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order'}],
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
  parentInfo: {
    nomParent: {
      type: String,
      required: function () {
        return this.role === 'student';
      },
    },
    prenomParent: {
      type: String,
      required: function () {
        return this.role === 'student';
      },
    },
    // Address fields removed - not needed as delivery is always at school
    adresse: { type: String }, // Optional, kept for backward compatibility
    app: { type: String }, // Optional
    ville: { type: String }, // Optional, kept for backward compatibility
    province: { type: String }, // Optional
    codePostal: { type: String }, // Optional
    telephone: {
      type: String,
      required: function () {
        return this.role === 'student';
      },
    },
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
    cellulaire: { type: String },
    momentPourJoindre: { type: String, required: function () { return this.role === 'school_manager'; } }
  },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  
  // Onboarding progress tracking
  onboardingProgress: {
    joinedCampaign: { type: Boolean, default: false },
    personalizedStore: { type: Boolean, default: false },
    visitedStore: { type: Boolean, default: false },
    viewedOrders: { type: Boolean, default: false },
    viewedStats: { type: Boolean, default: false },
    viewedTools: { type: Boolean, default: false },
    completedAt: { type: Date }
  }
});

// Ensure that either 'student' or 'school_manager' fields are valid
UserSchema.path('role').validate(function (value) {
  if (value === 'student') {
    // For students, require parentInfo (always required)
    // School and objectifPersonnel are optional for new multi-campaign system
    return !!this.parentInfo;
  }
  if (value === 'school_manager') {
    return !!this.schoolManagerInfo && 
           !!this.schoolManagerInfo.titreOuFonction && 
           !!this.schoolManagerInfo.organisme;
  }
  return false;
}, 'Invalid role requirements');

export default mongoose.models.User || mongoose.model('User', UserSchema);