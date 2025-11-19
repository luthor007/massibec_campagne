// scripts/migrate-commander-to-commande.js
// This script migrates all orders with status "Commander" to "Commandé"
// Run this after updating the Order model enum

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../src/models/Order.js';

dotenv.config({ path: '.env.local' });

async function migrateCommanderToCommande() {
    try {
        console.log('🚀 Starting migration: Commander → Commandé...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all orders with status "Commander"
        const ordersToUpdate = await Order.find({ status: 'Commander' });
        console.log(`📊 Found ${ordersToUpdate.length} orders with status "Commander"`);

        if (ordersToUpdate.length === 0) {
            console.log('✅ No orders to migrate. Migration complete.');
            await mongoose.disconnect();
            return;
        }

        // Update all orders
        let updatedCount = 0;
        let errorCount = 0;

        for (const order of ordersToUpdate) {
            try {
                order.status = 'Commandé';
                await order.save();
                updatedCount++;

                if (updatedCount % 100 === 0) {
                    console.log(`⏳ Updated ${updatedCount}/${ordersToUpdate.length} orders...`);
                }
            } catch (error) {
                console.error(`❌ Error updating order ${order._id}:`, error.message);
                errorCount++;
            }
        }

        // Verify the migration
        const remainingCommanderOrders = await Order.countDocuments({ status: 'Commander' });
        const commandeOrders = await Order.countDocuments({ status: 'Commandé' });

        console.log('\n📈 Migration Summary:');
        console.log(`   ✅ Successfully updated: ${updatedCount} orders`);
        console.log(`   ❌ Errors: ${errorCount} orders`);
        console.log(`   📊 Remaining "Commander" orders: ${remainingCommanderOrders}`);
        console.log(`   📊 Total "Commandé" orders: ${commandeOrders}`);

        if (remainingCommanderOrders === 0) {
            console.log('\n✅ Migration completed successfully! All orders have been migrated.');
        } else {
            console.log(`\n⚠️  Warning: ${remainingCommanderOrders} orders still have status "Commander"`);
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the migration
migrateCommanderToCommande();

