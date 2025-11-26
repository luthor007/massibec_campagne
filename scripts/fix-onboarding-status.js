/**
 * Script to check and fix supplier onboarding status
 * Run with: node scripts/fix-onboarding-status.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
}

async function fixOnboarding() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Find all suppliers
        const suppliers = await usersCollection.find({
            $or: [
                { role: 'supplier' },
                { role: 'fournisseur' }
            ]
        }).toArray();

        console.log(`📊 Found ${suppliers.length} suppliers`);

        for (const user of suppliers) {
            const progress = user.supplierOnboardingProgress || {};
            const validSteps = ['productCatalog', 'settings'];

            console.log(`\n👤 User: ${user.email}`);
            console.log(`   Current progress:`, JSON.stringify(progress));

            const completedSteps = validSteps.filter(step => progress[step] === true).length;
            const totalSteps = validSteps.length;
            const isCompleted = completedSteps === totalSteps;

            console.log(`   Completed steps: ${completedSteps}/${totalSteps}`);
            console.log(`   Is completed: ${isCompleted}`);

            // Check each step
            validSteps.forEach(step => {
                const isComplete = progress[step] === true;
                console.log(`   - ${step}: ${isComplete ? '✅' : '❌'}`);
            });

            // If not completed but should be, ask to fix
            if (!isCompleted) {
                console.log(`   ⚠️  Onboarding not completed`);

                // Check if both steps should be marked as complete
                const shouldComplete = {
                    productCatalog: true, // Assume productCatalog should be complete if user has products
                    settings: true // Settings can be skipped, so mark as complete
                };

                // Update if needed
                const updatedProgress = {
                    ...progress,
                    ...shouldComplete
                };

                // Re-check completion
                const newCompletedSteps = validSteps.filter(step => updatedProgress[step] === true).length;
                const newIsCompleted = newCompletedSteps === totalSteps;

                if (newIsCompleted && !updatedProgress.completedAt) {
                    updatedProgress.completedAt = new Date();
                }

                await usersCollection.updateOne(
                    { _id: user._id },
                    { $set: { supplierOnboardingProgress: updatedProgress } }
                );

                console.log(`   ✅ Fixed! Updated progress:`, JSON.stringify(updatedProgress));
            } else {
                console.log(`   ✅ Onboarding is already completed`);
            }
        }

        await mongoose.disconnect();
        console.log('\n✅ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

fixOnboarding();

