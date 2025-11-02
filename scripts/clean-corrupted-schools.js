/**
 * Script to clean up corrupted schools from the database
 * Run with: node scripts/clean-corrupted-schools.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function cleanCorruptedSchools() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('schools');
    
    console.log('🔍 Scanning schools for corrupted data...');

    // Get all document IDs without trying to parse the full documents
    const schoolIds = [];
    const corruptedIds = [];
    
    try {
      // Use raw cursor to scan documents
      const cursor = collection.find({}, { projection: { _id: 1 } });
      
      for await (const doc of cursor) {
        if (doc && doc._id) {
          schoolIds.push(doc._id);
        }
      }
    } catch (error) {
      console.error('❌ Error scanning schools:', error.message);
    }

    console.log(`📊 Found ${schoolIds.length} school IDs in collection`);

    // Now try to access each school individually
    console.log('\n🔍 Checking each school for corruption...');
    
    for (const id of schoolIds) {
      try {
        const school = await collection.findOne({ _id: id });
        
        // Validate the school
        if (!school || !school.name || typeof school.name !== 'string') {
          throw new Error('Invalid school data');
        }
        
        // Try to stringify the school (will fail if corrupted)
        JSON.stringify(school);
        
        console.log(`✅ Valid: ${school.name} (${school._id})`);
      } catch (error) {
        console.log(`❌ Corrupted school detected: ${id}`);
        corruptedIds.push(id);
      }
    }

    console.log(`\n⚠️  Found ${corruptedIds.length} corrupted schools out of ${schoolIds.length} total`);

    if (corruptedIds.length > 0) {
      console.log('\n🗑️  Deleting corrupted schools...');
      
      // Delete corrupted schools
      for (const id of corruptedIds) {
        try {
          const result = await collection.deleteOne({ _id: id });
          if (result.deletedCount > 0) {
            console.log(`✅ Deleted corrupted school: ${id}`);
          }
        } catch (error) {
          console.error(`❌ Failed to delete ${id}:`, error.message);
        }
      }

      console.log(`\n✅ Cleanup complete! Deleted ${corruptedIds.length} corrupted schools.`);
    }

    // Now try to get all valid schools
    console.log('\n📋 Listing remaining schools:');
    try {
      const validSchools = await collection.find({}).toArray();
      console.log(`Found ${validSchools.length} valid schools:`);
      validSchools.forEach(s => {
        console.log(`  - ${s.name || 'NO NAME'} (ID: ${s._id})`);
      });
    } catch (error) {
      console.error('❌ Error listing schools:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

// Run the cleanup
cleanCorruptedSchools();

