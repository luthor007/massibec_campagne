/**
 * Migration script to update supplierOnboardingProgress schema
 * from { companyInfo, productCatalog, paymentSetup } 
 * to { productCatalog, settings }
 * 
 * Run with: node migrations/migrate-supplier-onboarding-progress.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
}

async function migrate() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Find all users with supplier role
        const suppliers = await usersCollection.find({
            $or: [
                { role: 'supplier' },
                { role: 'fournisseur' }
            ],
            supplierOnboardingProgress: { $exists: true }
        }).toArray();

        console.log(`📊 Found ${suppliers.length} suppliers with onboarding progress`);

        let migrated = 0;
        let skipped = 0;

        for (const user of suppliers) {
            const progress = user.supplierOnboardingProgress || {};

            // Check if migration is needed
            const hasOldFields = progress.companyInfo !== undefined || progress.paymentSetup !== undefined;
            const hasNewFields = progress.settings !== undefined;

            if (!hasOldFields && hasNewFields) {
                skipped++;
                continue; // Already migrated
            }

            // Migrate: settings = companyInfo || paymentSetup (if either was true, settings is true)
            const newProgress = {
                productCatalog: progress.productCatalog || false,
                settings: (progress.companyInfo || progress.paymentSetup) ? true : (progress.settings || false),
                completedAt: progress.completedAt || null
            };

            // Update the user
            await usersCollection.updateOne(
                { _id: user._id },
                { $set: { supplierOnboardingProgress: newProgress } }
            );

            migrated++;
            console.log(`✅ Migrated user ${user.email}:`, {
                old: { companyInfo: progress.companyInfo, productCatalog: progress.productCatalog, paymentSetup: progress.paymentSetup },
                new: newProgress
            });
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   - Migrated: ${migrated} users`);
        console.log(`   - Skipped: ${skipped} users (already migrated)`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

migrate();

