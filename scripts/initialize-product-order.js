/**
 * Script to initialize product order field for existing products
 * Run with: node scripts/initialize-product-order.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function initializeProductOrder() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the collection directly
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    
    // Get all products
    const products = await collection.find({}).toArray();
    
    if (products.length === 0) {
      console.log('No products found.');
      return;
    }

    console.log(`Found ${products.length} products`);

    // Update each product with its current index as order (preserving current order)
    let updatedCount = 0;
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // Only update if order is not set or is 0
        if (!product.order || product.order === 0 || product.order === undefined) {
          await collection.updateOne(
            { _id: product._id },
            { $set: { order: i } }
          );
          updatedCount++;
          console.log(`✅ Set order ${i} for: ${product.name || product._id}`);
        } else {
          console.log(`⚠️  Product "${product.name || product._id}" already has order ${product.order}`);
        }
      } catch (e) {
        console.error(`❌ Error updating product ${product._id}:`, e.message);
      }
    }

    console.log(`\n✅ Initialized order for ${updatedCount} products`);
    console.log(`📦 Total products: ${products.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

initializeProductOrder();

