// scripts/test-inventory.js
// Script to test inventory after placing an OrderStudent order

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const StudentInventory = require('../src/models/StudentInventory').default;
const OrderStudent = require('../src/models/OrderStudent').default;
const Store = require('../src/models/Store').default;
const User = require('../src/models/User').default;

async function testInventory() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get user email from command line args
        const userEmail = process.argv[2];
        if (!userEmail) {
            console.error('❌ Please provide user email as argument');
            console.log('Usage: node scripts/test-inventory.js <user-email>');
            process.exit(1);
        }

        // Find user
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            console.error(`❌ User not found: ${userEmail}`);
            process.exit(1);
        }

        console.log(`\n📋 User: ${user.name} (${user.email})`);
        console.log(`   User ID: ${user._id}`);

        // Find user's store
        const store = await Store.findOne({ user: user._id });
        if (!store) {
            console.error('❌ Store not found for user');
            process.exit(1);
        }

        console.log(`\n🏪 Store: ${store.name || store._id}`);
        console.log(`   Store ID: ${store._id}`);
        console.log(`   Campaign ID: ${store.campaignId || 'None'}`);

        // Find latest OrderStudent for this user
        const latestOrder = await OrderStudent.findOne({ email: userEmail })
            .sort({ timestamp: -1 })
            .lean();

        if (!latestOrder) {
            console.log('\n⚠️  No OrderStudent found for this user');
            console.log('   This means no order has been placed yet.');
            process.exit(0);
        }

        console.log(`\n📦 Latest OrderStudent:`);
        console.log(`   Order ID: ${latestOrder.orderId}`);
        console.log(`   Timestamp: ${latestOrder.timestamp}`);
        console.log(`   Total Units: ${latestOrder.totalUnits}`);
        console.log(`   Total Amount: ${latestOrder.totalAmount}`);
        console.log(`   Products:`);
        latestOrder.products.forEach((p, i) => {
            console.log(`     ${i + 1}. ${p.productName}: ${p.quantity} units`);
        });

        // Get campaign ID
        const campaignId = store.campaignId || latestOrder.school?.toString();
        if (!campaignId) {
            console.error('❌ Could not determine campaign ID');
            process.exit(1);
        }

        console.log(`\n🎯 Campaign ID: ${campaignId}`);

        // Get all inventory for this user and campaign
        const inventoryRecords = await StudentInventory.find({
            userId: user._id,
            campaignId: campaignId
        }).lean();

        console.log(`\n📊 Inventory Records (${inventoryRecords.length}):`);
        if (inventoryRecords.length === 0) {
            console.log('   ⚠️  No inventory records found!');
            console.log('   This might mean:');
            console.log('   1. The OrderStudent was created but inventory was not initialized');
            console.log('   2. The campaignId does not match');
            console.log('   3. There was an error during inventory initialization');
        } else {
            inventoryRecords.forEach((inv, i) => {
                console.log(`\n   ${i + 1}. ${inv.productName}:`);
                console.log(`      Ordered: ${inv.orderedQuantity}`);
                console.log(`      Sold: ${inv.soldQuantity}`);
                console.log(`      Available: ${inv.availableQuantity}`);
                console.log(`      Status: ${inv.availableQuantity > 0 ? '✅ In Stock' : '❌ Out of Stock'}`);
            });
        }

        // Test the getInventoryMap method
        console.log(`\n🗺️  Testing getInventoryMap:`);
        try {
            const inventoryMap = await StudentInventory.getInventoryMap(
                user._id.toString(),
                campaignId.toString()
            );
            console.log('   Inventory Map:', JSON.stringify(inventoryMap, null, 2));
        } catch (error) {
            console.error('   ❌ Error calling getInventoryMap:', error.message);
        }

        // Check if store can fetch inventory via API endpoint logic
        console.log(`\n🔍 Testing Store Inventory Fetch Logic:`);
        const storeInventory = await StudentInventory.find({
            userId: store.user.toString(),
            campaignId: store.campaignId?.toString()
        }).lean();
        console.log(`   Found ${storeInventory.length} inventory records for store`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testInventory();

