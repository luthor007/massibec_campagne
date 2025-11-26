#!/usr/bin/env node
/**
 * Script to clean the database for launch - deletes all user data
 * but preserves Blogs and ScrapingCache
 * 
 * WARNING: This will delete ALL user data including:
 * - Users, Schools, Suppliers, Products, Campaigns, Orders, Stores, etc.
 * 
 * PRESERVES:
 * - Blogs (blog posts)
 * - ScrapingCache (scraping cache data)
 * 
 * Usage: node scripts/clean-database-for-launch.js [--force]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const mongoose = require('mongoose');

// Collections to PRESERVE (don't delete)
const PRESERVE_COLLECTIONS = [
    'blogs',
    'blog',
    'scrapingcaches',
    'scrapingcache'
];

// Collections to DELETE (all user-related data)
const COLLECTIONS_TO_DELETE = [
    'users',
    'schools',
    'suppliers',
    'products',
    'bundles',
    'campaigns',
    'orders',
    'orderstudents',
    'stores',
    'storevisits',
    'suppliermanagers',
    'schoolmanagers',
    'managerinvitations',
    'admininvitations',
    'adminmanagers',
    'studentinventories',
    'clients',
    'funnelveents',
    'conversionevents',
    'conversations',
    'messages',
    'reviews',
    'oldusers',
    'edicounters',
    'counters',
    'passwordresettokens',
    'storevisits'
];

async function connectDB() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error);
        throw error;
    }
}

async function getCollectionCount(collectionName) {
    try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        return count;
    } catch (error) {
        return 0;
    }
}

async function deleteCollection(collectionName) {
    try {
        const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
        return result.deletedCount || 0;
    } catch (error) {
        console.error(`⚠️  Error deleting collection ${collectionName}:`, error.message);
        return 0;
    }
}

async function getCollectionStats() {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const stats = {};

    for (const collection of collections) {
        const name = collection.name;
        const count = await getCollectionCount(name);
        stats[name] = count;
    }

    return stats;
}

async function cleanDatabase(force = false) {
    console.log('\n🧹 ========================================');
    console.log('   DATABASE CLEANUP FOR LAUNCH');
    console.log('   ========================================\n');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Get initial stats
    console.log('📊 Current database state:\n');
    const initialStats = await getCollectionStats();
    for (const [name, count] of Object.entries(initialStats)) {
        if (count > 0 || name.toLowerCase().includes('blog') || name.toLowerCase().includes('scraping')) {
            const preserved = PRESERVE_COLLECTIONS.some(p =>
                name.toLowerCase() === p.toLowerCase() ||
                name.toLowerCase() === p.toLowerCase() + 's'
            );
            console.log(`   ${preserved ? '🔒' : '📦'} ${name}: ${count} documents ${preserved ? '(WILL BE PRESERVED)' : ''}`);
        }
    }

    // Calculate what will be deleted
    let totalToDelete = 0;
    const collectionsToDelete = [];

    for (const collectionName of collectionNames) {
        const nameLower = collectionName.toLowerCase();

        // Skip system collections
        if (collectionName.startsWith('system.')) {
            continue;
        }

        // Check if should preserve
        const shouldPreserve = PRESERVE_COLLECTIONS.some(p =>
            nameLower === p.toLowerCase() ||
            nameLower === p.toLowerCase() + 's'
        );

        if (!shouldPreserve) {
            const count = initialStats[collectionName] || 0;
            if (count > 0) {
                collectionsToDelete.push({ name: collectionName, count });
                totalToDelete += count;
            }
        }
    }

    console.log('\n🗑️  Collections to DELETE:\n');
    if (collectionsToDelete.length === 0) {
        console.log('   ✅ No collections to delete (already clean)');
    } else {
        collectionsToDelete.forEach(({ name, count }) => {
            console.log(`   ❌ ${name}: ${count} documents`);
        });
        console.log(`\n   📊 Total documents to delete: ${totalToDelete}`);
    }

    console.log('\n🔒 Collections to PRESERVE:\n');
    const preservedCollections = [];
    for (const collectionName of collectionNames) {
        const nameLower = collectionName.toLowerCase();
        const shouldPreserve = PRESERVE_COLLECTIONS.some(p =>
            nameLower === p.toLowerCase() ||
            nameLower === p.toLowerCase() + 's'
        );
        if (shouldPreserve) {
            const count = initialStats[collectionName] || 0;
            preservedCollections.push({ name: collectionName, count });
            console.log(`   ✅ ${collectionName}: ${count} documents (PRESERVED)`);
        }
    }

    if (preservedCollections.length === 0) {
        console.log('   ⚠️  No blogs or scraping cache found');
    }

    // Confirmation
    if (!force) {
        console.log('\n⚠️  WARNING: This will DELETE ALL user data!');
        console.log('   This includes: Users, Schools, Suppliers, Products, Campaigns, Orders, Stores, etc.');
        console.log('   Only Blogs and ScrapingCache will be preserved.\n');
        console.log('   To proceed, run with --force flag:');
        console.log('   node scripts/clean-database-for-launch.js --force\n');
        return;
    }

    console.log('\n🚀 Starting deletion (--force flag detected)...\n');

    let totalDeleted = 0;
    const deletionResults = [];

    // Delete collections
    for (const { name, count } of collectionsToDelete) {
        try {
            const deleted = await deleteCollection(name);
            deletionResults.push({ name, deleted, requested: count });
            totalDeleted += deleted;
            console.log(`   ✅ ${name}: ${deleted} documents deleted`);
        } catch (error) {
            console.error(`   ❌ Error deleting ${name}:`, error.message);
            deletionResults.push({ name, deleted: 0, requested: count, error: error.message });
        }
    }

    // Verify preservation
    console.log('\n🔍 Verifying preserved collections:\n');
    const finalStats = await getCollectionStats();
    let allPreserved = true;

    for (const { name, count: initialCount } of preservedCollections) {
        const finalCount = finalStats[name] || 0;
        if (finalCount === initialCount) {
            console.log(`   ✅ ${name}: ${finalCount} documents (PRESERVED)`);
        } else {
            console.log(`   ⚠️  ${name}: ${initialCount} → ${finalCount} documents (CHECK THIS!)`);
            allPreserved = false;
        }
    }

    // Summary
    console.log('\n📊 ========================================');
    console.log('   CLEANUP SUMMARY');
    console.log('   ========================================\n');
    console.log(`   ✅ Total documents deleted: ${totalDeleted}`);
    console.log(`   ✅ Collections deleted: ${collectionsToDelete.length}`);
    console.log(`   ${allPreserved ? '✅' : '⚠️'} Preserved collections: ${preservedCollections.length}`);

    if (allPreserved) {
        console.log('\n   🎉 Database cleanup complete!');
        console.log('   🎉 Blogs and ScrapingCache have been preserved\n');
    } else {
        console.log('\n   ⚠️  WARNING: Some preserved collections may have been affected!\n');
    }

    // Show final state
    console.log('📊 Final database state:\n');
    const finalCollections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of finalCollections) {
        const count = finalStats[collection.name] || 0;
        if (count > 0) {
            const isPreserved = PRESERVE_COLLECTIONS.some(p =>
                collection.name.toLowerCase() === p.toLowerCase() ||
                collection.name.toLowerCase() === p.toLowerCase() + 's'
            );
            console.log(`   ${isPreserved ? '🔒' : '📦'} ${collection.name}: ${count} documents`);
        }
    }
    console.log('');
}

async function main() {
    try {
        const force = process.argv.includes('--force');

        await connectDB();
        await cleanDatabase(force);
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

main();

