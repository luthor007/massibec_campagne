#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Import models
const dbConnect = (await import('../src/lib/mongodb.js')).default;
const User = (await import('../src/models/User.js')).default;
const SchoolManager = (await import('../src/models/SchoolManager.js')).default;

async function migrateExistingManagers() {
  try {
    console.log('🚀 Starting migration of existing school managers...');
    
    // Connect to MongoDB
    await dbConnect();
    console.log('✅ Connected to MongoDB');

    // Find all existing school_manager users
    const existingManagers = await User.find({ role: 'school_manager' });
    console.log(`📊 Found ${existingManagers.length} existing school managers`);

    if (existingManagers.length === 0) {
      console.log('ℹ️  No existing managers to migrate');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const manager of existingManagers) {
      try {
        // Check if manager already has a SchoolManager record
        const existingSchoolManager = await SchoolManager.findOne({
          user: manager._id,
          status: 'active'
        });

        if (existingSchoolManager) {
          console.log(`⏭️  Skipping ${manager.name} (${manager.email}) - already migrated`);
          skippedCount++;
          continue;
        }

        // Get the school ID from schoolManagerInfo
        const schoolId = manager.schoolManagerInfo?.organisme;
        
        if (!schoolId) {
          console.log(`⚠️  Skipping ${manager.name} (${manager.email}) - no school associated`);
          skippedCount++;
          continue;
        }

        // Create SchoolManager record
        const schoolManager = new SchoolManager({
          school: schoolId,
          user: manager._id,
          role: 'owner', // All existing managers become owners
          invitedBy: manager._id, // Self-invited for existing managers
          invitedAt: manager.createdAt || new Date(),
          joinedAt: manager.createdAt || new Date(),
          status: 'active'
        });

        await schoolManager.save();
        
        console.log(`✅ Migrated ${manager.name} (${manager.email}) as Owner`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrating ${manager.name} (${manager.email}):`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total processed: ${existingManagers.length}`);

    // Verify migration
    const totalSchoolManagers = await SchoolManager.countDocuments({ status: 'active' });
    console.log(`\n🔍 Verification: ${totalSchoolManagers} active SchoolManager records in database`);

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration
migrateExistingManagers();


