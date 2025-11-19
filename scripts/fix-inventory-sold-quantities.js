// scripts/fix-inventory-sold-quantities.js
// Script to fix inventory sold quantities by calculating from existing orders

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const StudentInventory = require('../src/models/StudentInventory').default;
const Order = require('../src/models/Order').default;

async function fixInventorySoldQuantities() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get user email from command line args
        const userEmail = process.argv[2];
        if (!userEmail) {
            console.error('❌ Please provide user email as argument');
            console.log('Usage: node scripts/fix-inventory-sold-quantities.js <user-email>');
            process.exit(1);
        }

        // Find user
        const User = require('../src/models/User').default;
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            console.error(`❌ User not found: ${userEmail}`);
            process.exit(1);
        }

        console.log(`\n📋 User: ${user.name} (${user.email})`);
        console.log(`   User ID: ${user._id}`);

        // Get all inventory records for this user
        const inventoryRecords = await StudentInventory.find({ userId: user._id }).lean();

        if (inventoryRecords.length === 0) {
            console.log('\n⚠️  No inventory records found for this user');
            process.exit(0);
        }

        console.log(`\n📊 Found ${inventoryRecords.length} inventory records`);

        // Group by campaignId
        const inventoryByCampaign = {};
        inventoryRecords.forEach(inv => {
            const campaignId = inv.campaignId?.toString();
            if (!inventoryByCampaign[campaignId]) {
                inventoryByCampaign[campaignId] = [];
            }
            inventoryByCampaign[campaignId].push(inv);
        });

        // Fix each campaign's inventory
        for (const [campaignId, records] of Object.entries(inventoryByCampaign)) {
            console.log(`\n🎯 Processing campaign: ${campaignId}`);

            // Get all orders for this user in this campaign that have been paid or ordered
            const soldOrders = await Order.find({
                user: user._id,
                campaignId: mongoose.Types.ObjectId.isValid(campaignId)
                    ? new mongoose.Types.ObjectId(campaignId)
                    : campaignId,
                status: { $in: ['Payé', 'Commandé', 'Complété'] }
            }).lean();

            console.log(`   Found ${soldOrders.length} sold orders`);

            // Aggregate sold quantities by product name
            const soldQuantities = {};
            soldOrders.forEach(order => {
                if (order.products && Array.isArray(order.products)) {
                    order.products.forEach(item => {
                        const productName = item.productName || item.name;
                        if (productName) {
                            soldQuantities[productName] = (soldQuantities[productName] || 0) + (item.quantity || 0);
                        }
                    });
                }
            });

            console.log(`   Sold quantities:`, soldQuantities);

            // Update each inventory record
            for (const record of records) {
                const productName = record.productName;
                const alreadySold = soldQuantities[productName] || 0;
                const currentSold = record.soldQuantity || 0;
                const finalSoldQuantity = Math.max(alreadySold, currentSold);

                const availableQuantity = Math.max(0, record.orderedQuantity - finalSoldQuantity);

                console.log(`\n   📦 ${productName}:`);
                console.log(`      Ordered: ${record.orderedQuantity}`);
                console.log(`      Current sold: ${currentSold}`);
                console.log(`      Already sold from orders: ${alreadySold}`);
                console.log(`      Final sold: ${finalSoldQuantity}`);
                console.log(`      Available: ${availableQuantity}`);

                // Update the inventory record
                await StudentInventory.updateOne(
                    { _id: record._id },
                    {
                        $set: {
                            soldQuantity: finalSoldQuantity,
                            availableQuantity: availableQuantity
                        }
                    }
                );

                console.log(`      ✅ Updated`);
            }
        }

        console.log(`\n✅ Inventory fixed successfully!`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixInventorySoldQuantities();


