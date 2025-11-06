// Script to fix inconsistent school status fields
// Run with: node scripts/fix-school-status.js

const mongoose = require('mongoose');

// School schema (simplified)
const SchoolSchema = new mongoose.Schema({
  name: String,
  isActive: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'deactivated'],
    default: 'pending'
  },
  approved: { type: Boolean, required: true, default: false },
  // ... other fields
});

const School = mongoose.model('School', SchoolSchema);

async function fixSchoolStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/massibec-financement');
    console.log('Connected to MongoDB');

    // Get all schools
    const schools = await School.find({});
    console.log(`Found ${schools.length} schools to process`);

    let updatedCount = 0;

    for (const school of schools) {
      let needsUpdate = false;
      const updates = {};

      // Fix isActive based on status
      if (school.status === 'approved' && school.isActive !== true) {
        updates.isActive = true;
        needsUpdate = true;
        console.log(`School ${school.name}: Setting isActive = true (status: approved)`);
      } else if ((school.status === 'rejected' || school.status === 'deactivated') && school.isActive !== false) {
        updates.isActive = false;
        needsUpdate = true;
        console.log(`School ${school.name}: Setting isActive = false (status: ${school.status})`);
      }

      // Fix approved based on status
      if (school.status === 'approved' && school.approved !== true) {
        updates.approved = true;
        needsUpdate = true;
        console.log(`School ${school.name}: Setting approved = true (status: approved)`);
      } else if (school.status === 'rejected' && school.approved !== false) {
        updates.approved = false;
        needsUpdate = true;
        console.log(`School ${school.name}: Setting approved = false (status: rejected)`);
      }

      // Fix status based on approved
      if (school.approved === true && school.status !== 'approved') {
        updates.status = 'approved';
        updates.isActive = true;
        needsUpdate = true;
        console.log(`School ${school.name}: Setting status = approved, isActive = true (approved: true)`);
      } else if (school.approved === false && school.status === 'pending') {
        // Keep as pending if not explicitly rejected
        console.log(`School ${school.name}: Keeping status = pending (approved: false)`);
      }

      if (needsUpdate) {
        await School.findByIdAndUpdate(school._id, updates);
        updatedCount++;
        console.log(`Updated school: ${school.name}`);
      }
    }

    console.log(`\nCompleted! Updated ${updatedCount} schools out of ${schools.length}`);
    
  } catch (error) {
    console.error('Error fixing school status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixSchoolStatus();








