// scripts/migrate-school-owners.js
// This script creates SchoolManager records for users who created schools but don't have manager records

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const School = require('../src/models/School');
const SchoolManager = require('../src/models/SchoolManager');

async function migrateSchoolOwners() {
  try {
    console.log('Connecting to database...');
    const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!uri) {
      throw new Error('MONGODB_URI or DATABASE_URL environment variable is not set');
    }
    await mongoose.connect(uri);
    console.log('Connected to database');

    // Find all school_manager users
    const schoolManagers = await User.find({ role: 'school_manager' });
    console.log(`Found ${schoolManagers.length} school manager users`);

    let created = 0;
    let existing = 0;
    let errors = 0;

    for (const user of schoolManagers) {
      try {
        // Get the school ID from user's schoolManagerInfo
        const schoolId = user.schoolManagerInfo?.organisme;
        
        if (!schoolId) {
          console.log(`⚠️  User ${user.email} has no school associated`);
          continue;
        }

        // Check if school exists
        const school = await School.findById(schoolId);
        if (!school) {
          console.log(`⚠️  School ${schoolId} not found for user ${user.email}`);
          continue;
        }

        // Check if SchoolManager record already exists
        const existingManager = await SchoolManager.findOne({
          school: schoolId,
          user: user._id
        });

        if (existingManager) {
          console.log(`✓ SchoolManager already exists for ${user.email} at ${school.name}`);
          existing++;
          continue;
        }

        // Create SchoolManager record as owner
        const schoolManager = new SchoolManager({
          school: schoolId,
          user: user._id,
          role: 'owner',
          invitedBy: user._id, // Self-invited as creator
          status: 'active'
        });

        await schoolManager.save();
        console.log(`✓ Created SchoolManager for ${user.email} at ${school.name} as owner`);
        created++;

      } catch (error) {
        console.error(`✗ Error processing user ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Created: ${created}`);
    console.log(`Existing: ${existing}`);
    console.log(`Errors: ${errors}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
migrateSchoolOwners();

