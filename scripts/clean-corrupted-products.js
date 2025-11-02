/**
 * Script to clean up corrupted products from the database
 * Run with: node scripts/clean-corrupted-products.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function cleanCorruptedProducts() {
  try {
    // Connect to MongoDB using raw driver to handle corrupted data
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('products');
    
    console.log('🔍 Scanning products for corrupted data...');

    // Get all document IDs without trying to parse the full documents
    const productIds = [];
    const corruptedIds = [];
    
    try {
      // Use raw cursor to scan documents
      const cursor = collection.find({}, { projection: { _id: 1 } });
      
      for await (const doc of cursor) {
        if (doc && doc._id) {
          productIds.push(doc._id);
        }
      }
    } catch (error) {
      console.error('❌ Error scanning products:', error.message);
    }

    console.log(`📊 Found ${productIds.length} product IDs in collection`);

    // Now try to access each product individually
    console.log('\n🔍 Checking each product for corruption...');
    
    for (const id of productIds) {
      try {
        const product = await collection.findOne({ _id: id });
        
        // Validate the product
        if (!product || !product.name || typeof product.name !== 'string') {
          throw new Error('Invalid product data');
        }
        
        // Try to access all fields
        const testFields = ['name', 'description', 'price', 'cost', 'productId', 'image'];
        for (const field of testFields) {
          if (product[field] !== undefined) {
            // Just check if we can access it
            JSON.stringify(product[field]);
          }
        }
        
        console.log(`✅ Valid: ${product.name} (${product.productId || 'no ID'})`);
      } catch (error) {
        console.log(`❌ Corrupted product detected: ${id}`);
        corruptedIds.push(id);
      }
    }

    console.log(`\n⚠️  Found ${corruptedIds.length} corrupted products out of ${productIds.length} total`);

    if (corruptedIds.length > 0) {
      console.log('\n🗑️  Deleting corrupted products...');
      
      // Delete corrupted products
      for (const id of corruptedIds) {
        try {
          const result = await collection.deleteOne({ _id: id });
          if (result.deletedCount > 0) {
            console.log(`✅ Deleted corrupted product: ${id}`);
          }
        } catch (error) {
          console.error(`❌ Failed to delete ${id}:`, error.message);
        }
      }

      console.log(`\n✅ Cleanup complete! Deleted ${corruptedIds.length} corrupted products.`);
    }

    // Now try to get all valid products
    console.log('\n📋 Listing remaining products:');
    try {
      const validProducts = await collection.find({}).toArray();
      console.log(`Found ${validProducts.length} valid products:`);
      validProducts.forEach(p => {
        console.log(`  - ${p.name || 'NO NAME'} (ID: ${p._id}, ProductID: ${p.productId || 'NO ID'})`);
      });
    } catch (error) {
      console.error('❌ Error listing products:', error.message);
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
cleanCorruptedProducts();

