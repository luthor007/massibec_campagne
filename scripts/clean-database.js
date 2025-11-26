#!/usr/bin/env node
/**
 * Script to clean the database completely, keeping only ScrapingCache
 * Usage: node scripts/clean-database.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

// Collections to keep (don't delete)
const KEEP_COLLECTIONS = ['scrapingcaches', 'scrapingcache'];

// Collections to delete (MongoDB collection names are usually pluralized and lowercase)
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
    'studentinventories',
    'clients',
    'funnelvevents',
    'conversionevents',
    'edicounters',
    'oldusers',
];

async function connectDB() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
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
        // Collection might not exist
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

async function cleanDatabase() {
    console.log('\n🧹 Starting database cleanup...\n');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('📊 Current collections:');
    for (const collectionName of collectionNames) {
        const count = await getCollectionCount(collectionName);
        console.log(`   - ${collectionName}: ${count} documents`);
    }

    console.log('\n🗑️  Deleting collections (keeping ScrapingCache)...\n');

    let totalDeleted = 0;

    // Delete collections directly using MongoDB driver
    for (const collectionName of collectionNames) {
        const collectionNameLower = collectionName.toLowerCase();

        // Skip system collections and ScrapingCache
        if (collectionName.startsWith('system.')) {
            continue;
        }

        // Skip collections we want to keep
        if (KEEP_COLLECTIONS.some(keep => collectionNameLower === keep || collectionNameLower === keep + 's')) {
            console.log(`   🔒 ${collectionName}: KEPT (ScrapingCache)`);
            continue;
        }

        // Delete if it's in our delete list or if it's not a known collection to keep
        const shouldDelete = COLLECTIONS_TO_DELETE.some(del =>
            collectionNameLower === del ||
            collectionNameLower === del + 's' ||
            collectionNameLower === del.slice(0, -1) // Handle singular/plural variations
        );

        if (shouldDelete || !collectionNameLower.includes('scraping')) {
            try {
                const count = await getCollectionCount(collectionName);
                if (count > 0) {
                    const deleted = await deleteCollection(collectionName);
                    console.log(`   ✅ ${collectionName}: ${deleted} documents deleted`);
                    totalDeleted += deleted;
                } else {
                    console.log(`   ⏭️  ${collectionName}: 0 documents (already empty)`);
                }
            } catch (error) {
                console.error(`   ⚠️  Could not delete ${collectionName}:`, error.message);
            }
        }
    }

    console.log('\n📊 Final collection counts:');
    const finalCollections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of finalCollections) {
        const count = await getCollectionCount(collection.name);
        if (count > 0 || collection.name.toLowerCase().includes('scraping')) {
            console.log(`   - ${collection.name}: ${count} documents`);
        }
    }

    console.log(`\n✅ Database cleanup complete! Total documents deleted: ${totalDeleted}`);
    console.log('✅ ScrapingCache has been preserved\n');
}

async function main() {
    try {
        await connectDB();
        await cleanDatabase();
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
