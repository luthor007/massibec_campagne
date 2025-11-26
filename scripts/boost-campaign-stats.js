// Script to boost campaign #1 statistics for screenshot purposes
// Usage: node scripts/boost-campaign-stats.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dbConnect from '../src/lib/mongodb.js';
import Campaign from '../src/models/Campaign.js';
import Order from '../src/models/Order.js';
import User from '../src/models/User.js';
import School from '../src/models/School.js';
import Product from '../src/models/Product.js';
import Supplier from '../src/models/Supplier.js';
import SchoolManager from '../src/models/SchoolManager.js';
import { generateSlug } from '../src/utils/slugHelpers.js';

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function boostCampaignStats() {
    try {
        // Connect to MongoDB directly
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment variables');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find user by email
        const userEmail = 'alexis.massicotte@icloud.com';
        const user = await User.findOne({ email: userEmail });

        if (!user) {
            console.error(`❌ User with email ${userEmail} not found`);
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name} (${user.email})`);

        // Find school associated with this user
        let school = null;

        if (user.role === 'school_manager') {
            // Find school via SchoolManager
            const schoolManager = await SchoolManager.findOne({
                user: user._id,
                status: 'active'
            }).populate('school');

            if (schoolManager && schoolManager.school) {
                school = schoolManager.school;
            } else if (user.schoolManagerInfo?.organisme) {
                school = await School.findById(user.schoolManagerInfo.organisme);
            }
        } else if (user.role === 'student') {
            // For students, find school from campaigns
            if (user.campaigns && user.campaigns.length > 0) {
                const firstCampaign = await Campaign.findById(user.campaigns[0].campaignId);
                if (firstCampaign) {
                    school = await School.findById(firstCampaign.school);
                }
            } else if (user.school) {
                school = await School.findById(user.school);
            }
        }

        // If still no school, try to find any school with campaign #1
        if (!school) {
            console.log('⚠️  No school found for user, searching for any school with campaign #1...');
            const campaignWithSchool = await Campaign.findOne({ campaignNumber: 1 })
                .populate('school');
            if (campaignWithSchool && campaignWithSchool.school) {
                school = campaignWithSchool.school;
                console.log(`✅ Found school via campaign: ${school.name} (${school.code})`);
            }
        }

        if (!school) {
            console.error('❌ No school found. Please ensure the user has a school association or there is at least one campaign #1 in the database.');
            process.exit(1);
        }

        console.log(`✅ Found school: ${school.name} (${school.code})`);

        // Find campaign #1 for this school
        const campaign = await Campaign.findOne({
            school: school._id,
            campaignNumber: 1
        }).populate('supplier');

        if (!campaign) {
            console.error('❌ Campaign #1 not found for this school');
            process.exit(1);
        }

        console.log(`✅ Found campaign: ${campaign.campaignCode} (ID: ${campaign._id})`);

        // Get products from the campaign's supplier
        const products = await Product.find({ supplier: campaign.supplier._id }).limit(10);

        if (products.length === 0) {
            console.error('❌ No products found for this supplier');
            process.exit(1);
        }

        console.log(`✅ Found ${products.length} products`);

        // Boost statistics with impressive numbers
        const targetSales = 45000; // $45,000 in sales
        const targetOrders = 850; // 850 orders
        const targetParticipants = 120; // 120 participants

        console.log('\n📊 Boosting campaign statistics...');
        console.log(`   Target Sales: $${targetSales.toLocaleString()}`);
        console.log(`   Target Orders: ${targetOrders}`);
        console.log(`   Target Participants: ${targetParticipants}`);

        // Update campaign statistics
        campaign.totalSales = targetSales;
        campaign.totalOrders = targetOrders;
        campaign.totalParticipants = targetParticipants;
        campaign.isActive = true;
        campaign.status = 'active';

        await campaign.save();
        console.log('✅ Campaign statistics updated');

        // Get or create users and stores for this campaign
        let existingUsers = await User.find({
            role: 'student',
            campaigns: { $elemMatch: { campaignId: campaign._id } }
        }).limit(targetParticipants);

        // If not enough users, create test users
        if (existingUsers.length < targetParticipants) {
            console.log(`\n👥 Creating ${targetParticipants - existingUsers.length} test users...`);
            const usersToCreate = targetParticipants - existingUsers.length;

            for (let i = 0; i < usersToCreate; i++) {
                const testUser = new User({
                    email: `test-user-${campaign._id}-${i}@example.com`,
                    password: 'test123', // In production, this should be hashed
                    name: `Test User ${i + 1}`,
                    role: 'student',
                    campaigns: [{
                        campaignId: campaign._id,
                        schoolId: school._id,
                        joinedAt: new Date(),
                        objectifPersonnel: Math.floor(Math.random() * 500) + 100,
                        isActive: true
                    }],
                    activeCampaignId: campaign._id,
                    emailVerified: true,
                    parentInfo: {
                        prenomParent: `Parent ${i + 1}`,
                        nomParent: 'Test',
                        telephone: `514-000-${String(i).padStart(4, '0')}`
                    }
                });
                await testUser.save();
                existingUsers.push(testUser);
            }
            console.log(`✅ Created ${usersToCreate} test users`);
        }

        console.log(`\n🏪 Ensuring stores exist for ${existingUsers.length} users...`);

        // Use mongoose.model to get Store model to avoid import issues
        const Store = mongoose.models.Store || mongoose.model('Store', new mongoose.Schema({
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
            name: { type: String, required: true },
            slug: { type: String, unique: true, sparse: true },
            autoDeposit: { type: Boolean, required: true },
            discountEnabled: { type: Boolean, default: true }
        }));

        // Ensure each user has a store for this campaign
        for (const user of existingUsers) {
            let store = await Store.findOne({ user: user._id, campaignId: campaign._id });
            if (!store) {
                const baseSlug = generateSlug(user.name);
                let slug = baseSlug;
                let counter = 1;

                while (await Store.findOne({ slug, _id: { $ne: null } })) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }

                store = new Store({
                    user: user._id,
                    campaignId: campaign._id,
                    name: `Campagne de ${user.name}`,
                    autoDeposit: false,
                    discountEnabled: true,
                    slug: slug
                });
                await store.save();
            }
        }

        // Create sample orders to make it look realistic
        const sampleOrders = [];
        const orderCount = Math.min(targetOrders, 200); // Create up to 200 orders for realism

        console.log(`\n📦 Creating ${orderCount} sample orders...`);

        // Get stores for these users
        const stores = await Store.find({ campaignId: campaign._id }).limit(existingUsers.length);

        // Create orders with realistic distribution
        for (let i = 0; i < orderCount; i++) {
            const orderUser = existingUsers.length > 0
                ? existingUsers[Math.floor(Math.random() * existingUsers.length)]
                : null;

            const orderStore = stores.length > 0
                ? stores[Math.floor(Math.random() * stores.length)]
                : null;

            if (!orderUser || !orderStore) {
                continue; // Skip if no user or store
            }

            const orderProducts = [];
            const numProducts = Math.floor(Math.random() * 5) + 1; // 1-5 products per order

            let orderTotal = 0;
            for (let j = 0; j < numProducts; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 units

                // Get custom price or default price
                const customPrice = campaign.customPrices?.find(
                    cp => cp.productId?.toString() === product._id.toString()
                );
                const price = customPrice?.price || product.price || 10;
                const cost = product.cost || price * 0.6; // Estimate cost if not available

                orderTotal += price * quantity;

                orderProducts.push({
                    product: product._id,
                    quantity: quantity,
                    productName: product.name,
                    productCost: cost,
                    productPrice: price
                });
            }

            // Add some donations occasionally
            const hasDonation = Math.random() > 0.7; // 30% chance
            const studentDonation = hasDonation ? Math.floor(Math.random() * 10) + 2 : 0;
            const schoolDonation = hasDonation ? Math.floor(Math.random() * 5) + 1 : 0;

            orderTotal += studentDonation + schoolDonation;

            const order = new Order({
                user: orderUser._id,
                store: orderStore._id,
                school: school.code, // Order schema expects school as String
                campaignId: campaign._id,
                campaignNumber: campaign.campaignNumber,
                products: orderProducts,
                totalAmount: orderTotal,
                customerName: orderUser.name,
                customerEmail: orderUser.email,
                phoneNumber: '514-000-0000',
                status: 'Complété',
                studentDonation: studentDonation,
                schoolDonation: schoolDonation,
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
            });

            sampleOrders.push(order);
        }

        // Save orders in batches
        const batchSize = 50;
        for (let i = 0; i < sampleOrders.length; i += batchSize) {
            const batch = sampleOrders.slice(i, i + batchSize);
            await Order.insertMany(batch);
            console.log(`   ✅ Created ${Math.min(i + batchSize, sampleOrders.length)}/${sampleOrders.length} orders`);
        }

        // Update user statistics for participants
        if (existingUsers.length > 0) {
            console.log(`\n👥 Updating ${Math.min(existingUsers.length, targetParticipants)} user statistics...`);

            for (let i = 0; i < Math.min(existingUsers.length, targetParticipants); i++) {
                const user = existingUsers[i];
                // Update user's campaign stats
                const userCampaign = user.campaigns.find(c => c.campaignId.toString() === campaign._id.toString());
                if (userCampaign) {
                    // Set realistic personal goals and stats
                    userCampaign.objectifPersonnel = Math.floor(Math.random() * 500) + 100; // $100-$600
                }
                await user.save();
            }
        }

        console.log('\n✅ Campaign statistics boosted successfully!');
        console.log('\n📊 Final Statistics:');
        console.log(`   Total Sales: $${campaign.totalSales.toLocaleString()}`);
        console.log(`   Total Orders: ${campaign.totalOrders}`);
        console.log(`   Total Participants: ${campaign.totalParticipants}`);
        console.log(`   Progress: ${((campaign.totalSales / campaign.financialGoal) * 100).toFixed(1)}% of goal`);
        console.log(`\n🎯 Campaign is now ready for screenshots!`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

boostCampaignStats();

