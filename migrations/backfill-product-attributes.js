// Migration: Backfill product attributes for legacy documents
// Run with: node migrations/backfill-product-attributes.js

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env.local first, then fallback to .env
const envFiles = ['.env.local', '.env'];
for (const file of envFiles) {
  dotenv.config({
    path: path.resolve(process.cwd(), file),
    override: false
  });
}

const DEFAULT_ATTRIBUTES = {
  freezable: false,
  glutenFree: false,
  vegetarian: false,
  vegan: false,
  nutFree: false,
  halal: false,
  kosher: false,
  organic: false,
  quebecProduct: false,
  allergens: ''
};

// Define a lightweight Product schema for the migration context
const productSchema = new mongoose.Schema({
  attributes: {
    freezable: Boolean,
    glutenFree: Boolean,
    vegetarian: Boolean,
    vegan: Boolean,
    nutFree: Boolean,
    halal: Boolean,
    kosher: Boolean,
    organic: Boolean,
    quebecProduct: Boolean,
    allergens: String
  },
  freezable: Boolean
}, {
  strict: false,
  minimize: false,
  collection: 'products'
});

const Product = mongoose.models.MigrationProduct || mongoose.model('MigrationProduct', productSchema);

function buildAttributes(product) {
  const attrs = product.attributes || {};

  return {
    freezable: typeof attrs.freezable === 'boolean'
      ? attrs.freezable
      : (typeof product.freezable === 'boolean' ? product.freezable : DEFAULT_ATTRIBUTES.freezable),
    glutenFree: typeof attrs.glutenFree === 'boolean' ? attrs.glutenFree : DEFAULT_ATTRIBUTES.glutenFree,
    vegetarian: typeof attrs.vegetarian === 'boolean' ? attrs.vegetarian : DEFAULT_ATTRIBUTES.vegetarian,
    vegan: typeof attrs.vegan === 'boolean' ? attrs.vegan : DEFAULT_ATTRIBUTES.vegan,
    nutFree: typeof attrs.nutFree === 'boolean' ? attrs.nutFree : DEFAULT_ATTRIBUTES.nutFree,
    halal: typeof attrs.halal === 'boolean' ? attrs.halal : DEFAULT_ATTRIBUTES.halal,
    kosher: typeof attrs.kosher === 'boolean' ? attrs.kosher : DEFAULT_ATTRIBUTES.kosher,
    organic: typeof attrs.organic === 'boolean' ? attrs.organic : DEFAULT_ATTRIBUTES.organic,
    quebecProduct: typeof attrs.quebecProduct === 'boolean' ? attrs.quebecProduct : DEFAULT_ATTRIBUTES.quebecProduct,
    allergens: typeof attrs.allergens === 'string'
      ? attrs.allergens.substring(0, 500)
      : DEFAULT_ATTRIBUTES.allergens
  };
}

function attributesDiffer(a, b) {
  return Object.keys(DEFAULT_ATTRIBUTES).some((key) => a[key] !== b[key]);
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI. Please set it in your environment or .env.local');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const cursor = Product.find({}, null, { lean: true }).cursor();
  let scanned = 0;
  let updated = 0;
  let createdAttributes = 0;
  let legacyFreezableMigrated = 0;

  for await (const product of cursor) {
    scanned += 1;
    const hadAttributes = !!product.attributes;

    const newAttributes = buildAttributes(product);
    const existingAttributes = hadAttributes
      ? buildAttributes({ attributes: product.attributes })
      : DEFAULT_ATTRIBUTES;

    if (!hadAttributes || attributesDiffer(existingAttributes, newAttributes)) {
      await Product.updateOne(
        { _id: product._id },
        { $set: { attributes: newAttributes } },
        { upsert: false }
      );
      updated += 1;
      if (!hadAttributes) {
        createdAttributes += 1;
      }
      if (typeof product.freezable === 'boolean' && !hadAttributes) {
        legacyFreezableMigrated += 1;
      }
    }

    if (scanned % 100 === 0) {
      console.log(`Processed ${scanned} products...`);
    }
  }

  console.log('Migration complete.');
  console.log(`Products scanned: ${scanned}`);
  console.log(`Products updated: ${updated}`);
  console.log(`Products that received a fresh attributes object: ${createdAttributes}`);
  console.log(`Legacy "freezable" flag copied into attributes: ${legacyFreezableMigrated}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  process.exit(0);
}

run().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
