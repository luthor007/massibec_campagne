import mongoose from 'mongoose';
import School from './School'
import Order from './Order'

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'school_manager'], required: true }, // Define role


  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: Order}],
  orderCounter: { type: Number, default: 0 }, // Initialize counter to 0


  // Fields for students
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: School,
    required: function () {
      return this.role === 'student';
    },
  },
  objectifPersonnel: {
    type: Number,
    required: function () {
      return this.role === 'student';
    },
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
    adresse: {
      type: String,
      required: function () {
        return this.role === 'student';
      },
    },
    app: { type: String },
    ville: {
      type: String,
      required: function () {
        return this.role === 'student';
      },
    },
    province: {
      type: String,
      required: function () {
        return this.role === 'student';
      },
    },
    codePostal: {
      type: String,
      required: function () {
        return this.role === 'student';
      },
    },
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
});

// Ensure that either 'student' or 'school_manager' fields are valid
UserSchema.path('role').validate(function (value) {
  if (value === 'student') {
    return !!this.school && !!this.objectifPersonnel && !!this.parentInfo;
  }
  if (value === 'school_manager') {
    return !!this.schoolManagerInfo && 
           !!this.schoolManagerInfo.titreOuFonction && 
           !!this.schoolManagerInfo.organisme;
  }
  return false;
}, 'Invalid role requirements');

export default mongoose.models.User || mongoose.model('User', UserSchema);