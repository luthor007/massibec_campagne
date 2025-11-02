#!/usr/bin/env node

// Migration script to add donation configuration to existing campaigns
// Run with: node scripts/migrate-donation-splits.js

import mongoose from 'mongoose';
import Campaign from '../src/models/Campaign.js';
import Order from '../src/models/Order.js';
import OrderStudent from '../src/models/OrderStudent.js';
import { calculateDonationProfits } from '../src/utils/campaignHelpers.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

async function migrateDonationSplits() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Add donation configuration to all campaigns
    console.log('\n1. Adding donation configuration to campaigns...');
    const campaigns = await Campaign.find({});
    console.log(`Found ${campaigns.length} campaigns to update`);

    let campaignsUpdated = 0;
    for (const campaign of campaigns) {
      const updateData = {};
      
      // Add donationPresets if not exists
      if (!campaign.donationPresets) {
        updateData.donationPresets = [0, 2, 5];
      }
      
      // Add donationSplit if not exists
      if (!campaign.donationSplit) {
        updateData.donationSplit = {
          studentCash: 50.0,
          studentSchoolAccount: 16.7,
          schoolProject: 33.3
        };
      }

      if (Object.keys(updateData).length > 0) {
        await Campaign.findByIdAndUpdate(campaign._id, { $set: updateData });
        campaignsUpdated++;
        console.log(`Updated campaign ${campaign.campaignCode}`);
      }
    }
    console.log(`Updated ${campaignsUpdated} campaigns`);

    // 2. Backfill tipBreakdown for existing orders
    console.log('\n2. Backfilling tipBreakdown for existing orders...');
    const ordersWithTips = await Order.find({ 
      tip: { $gt: 0 },
      tipBreakdown: { $exists: false }
    }).populate('campaignId');
    
    console.log(`Found ${ordersWithTips.length} orders with tips to backfill`);

    let ordersUpdated = 0;
    for (const order of ordersWithTips) {
      let tipBreakdown = { studentCash: 0, studentSchoolAccount: 0, schoolProject: 0 };
      
      if (order.campaignId) {
        tipBreakdown = calculateDonationProfits(order.tip, order.campaignId);
      } else {
        // Use default split for orders without campaign
        tipBreakdown = calculateDonationProfits(order.tip, null);
      }

      await Order.findByIdAndUpdate(order._id, { 
        $set: { tipBreakdown: tipBreakdown }
      });
      
      ordersUpdated++;
      if (ordersUpdated % 100 === 0) {
        console.log(`Updated ${ordersUpdated} orders...`);
      }
    }
    console.log(`Updated ${ordersUpdated} orders with tipBreakdown`);

    // 3. Backfill tipBreakdown for existing OrderStudent records
    console.log('\n3. Backfilling tipBreakdown for existing OrderStudent records...');
    const orderStudentsWithTips = await OrderStudent.find({ 
      tip: { $gt: 0 },
      tipBreakdown: { $exists: false }
    });
    
    console.log(`Found ${orderStudentsWithTips.length} OrderStudent records with tips to backfill`);

    let orderStudentsUpdated = 0;
    for (const orderStudent of orderStudentsWithTips) {
      // Use default split for OrderStudent records (no campaign context)
      const tipBreakdown = calculateDonationProfits(orderStudent.tip, null);

      await OrderStudent.findByIdAndUpdate(orderStudent._id, { 
        $set: { tipBreakdown: tipBreakdown }
      });
      
      orderStudentsUpdated++;
      if (orderStudentsUpdated % 100 === 0) {
        console.log(`Updated ${orderStudentsUpdated} OrderStudent records...`);
      }
    }
    console.log(`Updated ${orderStudentsUpdated} OrderStudent records with tipBreakdown`);

    console.log('\n✅ Migration completed successfully!');
    console.log(`Summary:`);
    console.log(`- ${campaignsUpdated} campaigns updated with donation configuration`);
    console.log(`- ${ordersUpdated} orders updated with tipBreakdown`);
    console.log(`- ${orderStudentsUpdated} OrderStudent records updated with tipBreakdown`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateDonationSplits();

