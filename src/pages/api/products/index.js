import connectDB from '../../../lib/mongodb';
import Product from '../../../models/Product';
import Bundle from '../../../models/Bundle';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import Supplier from '../../../models/Supplier';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';
import { calculateDeliveryCostPerProduct } from '../../../lib/deliveryCalculator';

const roundToTwoDecimals = (value) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return 0;
  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};

const buildAddressString = (entity) => {
  if (!entity) return null;
  const parts = [];
  if (entity.address) parts.push(entity.address);
  if (entity.ville) parts.push(entity.ville);
  if (entity.codePostal) parts.push(entity.codePostal);
  if (parts.length === 0) {
    return null;
  }
  // Assume Canada if not provided
  if (!parts[parts.length - 1]?.toLowerCase?.().includes('canada')) {
    parts.push('Canada');
  }
  return parts.join(', ');
};

const estimateDeliveryCostForProduct = (productDoc, supplierAddress, schoolAddress) => {
  if (!supplierAddress || !schoolAddress || !productDoc) {
    return null;
  }

  const ti = productDoc.pallet?.ti || 0;
  const hi = productDoc.pallet?.hi || 0;
  if (ti <= 0 || hi <= 0) {
    return null;
  }

  const casePackValue = parseInt(productDoc.casePack, 10) || 1;
  const productsPerPallet = ti * hi * casePackValue;
  const halfPalletQuantity = Math.max(1, Math.floor(productsPerPallet * 0.5));

  if (!halfPalletQuantity) {
    return null;
  }

  try {
    return calculateDeliveryCostPerProduct({
      product: productDoc,
      supplierAddress,
      schoolAddress,
      totalQuantity: halfPalletQuantity,
      requiresTailgate: false,
      isLimitedAccess: false
    });
  } catch (error) {
    console.error('Error estimating delivery cost for product:', productDoc?._id || productDoc?.name, error);
    return null;
  }
};

const deriveDeliveryCostValue = (productDoc, supplierAddress, schoolAddress) => {
  if (!productDoc) return 0;
  const storedDeliveryCost = Number(productDoc.deliveryCostToSchool);
  if (!Number.isNaN(storedDeliveryCost) && storedDeliveryCost > 0) {
    return roundToTwoDecimals(storedDeliveryCost);
  }

  const estimated = estimateDeliveryCostForProduct(productDoc, supplierAddress, schoolAddress);
  if (estimated === null || estimated === undefined) {
    return 0;
  }
  return roundToTwoDecimals(estimated);
};

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 10, search = '', schoolId, campaignId, supplierId } = req.query;
      const supplierIdValid = supplierId && mongoose.Types.ObjectId.isValid(supplierId);

      // Convert params to numbers
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);

      // Query object with search conditions
      let query = {};

      // Add search conditions only if search term is provided
      if (search && search.trim()) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      // Filter by supplier if provided (products are supplier-specific)
      if (supplierIdValid) {
        query.supplier = supplierId;
      }

      // Products are universal, so we don't filter by school
      // But we keep the schoolId parameter for backward compatibility
      // if (schoolId && mongoose.Types.ObjectId.isValid(schoolId)) {
      //   query.school = schoolId;
      // }

      // Prepare context for custom pricing / delivery estimation FIRST
      // This is needed to filter products by supplier before fetching
      let activeCampaign = null;
      let schoolDoc = null;
      let supplierContextDoc = null;

      if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
        // Directly fetch campaign by ID (campaign-based approach)
        // Populate customPrices.productId just like in /api/campaigns/index.js
        activeCampaign = await Campaign.findById(campaignId)
          .populate('customPrices.productId', '_id')
          .populate('supplier', '_id')
          .lean();

        // Filter products by campaign's supplier if supplier is not already specified
        if (!supplierIdValid && activeCampaign?.supplier) {
          const campaignSupplierId = activeCampaign.supplier._id || activeCampaign.supplier;
          query.supplier = campaignSupplierId;
        }

        console.log(`[products API] Fetched campaign ${campaignId}, customPrices count:`, activeCampaign?.customPrices?.length || 0);
        if (activeCampaign?.customPrices?.length > 0) {
          console.log(`[products API] Sample customPrice:`, {
            productId: activeCampaign.customPrices[0]?.productId?._id?.toString() || activeCampaign.customPrices[0]?.productId?.toString(),
            price: activeCampaign.customPrices[0]?.price
          });
        } else {
          console.log(`[products API] WARNING: Campaign ${campaignId} has no customPrices or empty array`);
        }
        if (!activeCampaign) {
          console.log(`[products API] ERROR: Campaign ${campaignId} not found in database`);
        }
      } else if (schoolId && mongoose.Types.ObjectId.isValid(schoolId)) {
        // Fallback: get school and find active campaign (legacy approach)
        schoolDoc = await School.findById(schoolId).lean();
        if (schoolDoc) {
          // Try to find campaign in Campaign collection first
          activeCampaign = await Campaign.findOne({
            school: schoolId,
            isActive: true,
            status: { $in: ['approved', 'active', 'pending_approval', 'pending_school_approval'] }
          })
            .populate('customPrices.productId', '_id')
            .populate('supplier', '_id')
            .lean();

          // Filter products by campaign's supplier if supplier is not already specified
          if (!supplierIdValid && activeCampaign?.supplier) {
            const campaignSupplierId = activeCampaign.supplier._id || activeCampaign.supplier;
            query.supplier = campaignSupplierId;
          }

          console.log(`[products API] Fetched campaign by schoolId ${schoolId}, customPrices count:`, activeCampaign?.customPrices?.length || 0);

          // If not found, fallback to school's embedded campaigns
          if (!activeCampaign) {
            const schoolCampaign = schoolDoc.campaigns?.find(campaign => campaign.isActive);
            if (schoolCampaign) {
              activeCampaign = schoolCampaign;
              // Also filter by supplier from embedded campaign if available
              if (!supplierIdValid && schoolCampaign.supplier) {
                query.supplier = schoolCampaign.supplier;
              }
            }
          }
        }
      }

      if (!schoolDoc && activeCampaign?.school) {
        try {
          schoolDoc = await School.findById(activeCampaign.school).lean();
        } catch (error) {
          console.error('Error loading school context for products API:', error);
        }
      }

      if (supplierIdValid) {
        supplierContextDoc = await Supplier.findById(supplierId).lean();
      }

      if (!supplierContextDoc && activeCampaign?.supplier) {
        try {
          supplierContextDoc = await Supplier.findById(activeCampaign.supplier).lean();
        } catch (error) {
          console.error('Error loading supplier context for products API:', error);
        }
      }

      // NOW fetch products with the correct query (including supplier filter if needed)
      let products = [];
      let bundles = [];
      try {
        // First, try to get product count
        const total = await Product.countDocuments(query);

        if (total > 0) {
          // Try to fetch products with error handling for each document
          // Use .lean() to get plain JavaScript objects with all nested fields including attributes
          const productDocs = await Product.find(query)
            .sort({ order: 1, createdAt: -1 }) // Sort by order first, then by creation date
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .lean(); // Use lean() to get plain objects with nested attributes properly included

          // Validate and filter out corrupted products
          products = productDocs.map((product) => {
            try {
              if (product && product._id && product.name) {
                // product is already a plain object from .lean(), but ensure it's valid
                return { ...product, isBundle: false };
              }
              return null;
            } catch (e) {
              return null;
            }
          }).filter(Boolean);
        }
      } catch (error) {
        console.error('Error fetching products (will return empty list):', error.message);
        products = [];
      }

      const supplierIdForBundles = supplierIdValid
        ? supplierId
        : supplierContextDoc?._id?.toString();

      if (supplierIdForBundles) {
        try {
          bundles = await Bundle.find({ supplier: supplierIdForBundles })
            .populate('includedProducts.product')
            .sort({ order: 1, createdAt: -1 })
            .lean();
        } catch (bundleError) {
          console.error('Error fetching bundles:', bundleError);
          bundles = [];
        }
      }

      // Get total number of products for pagination
      const total = await Product.countDocuments(query);

      // Sanitize output and apply custom pricing
      const supplierAddressString = buildAddressString(supplierContextDoc);
      const schoolAddressString = buildAddressString(schoolDoc);

      const sanitizedProducts = products.filter((product) => {
        // Filter out products with invalid data
        try {
          return product &&
            product._id &&
            product.name &&
            typeof product.name === 'string' &&
            product.price !== undefined &&
            product.cost !== undefined;
        } catch (e) {
          console.error('Corrupted product detected:', product._id);
          return false;
        }
      }).map((product) => {
        try {
          const pricePickupValue = Number(product.pricePickup);
          const deliveryCostValue = (supplierAddressString && schoolAddressString)
            ? deriveDeliveryCostValue(product, supplierAddressString, schoolAddressString)
            : roundToTwoDecimals(Number(product.deliveryCostToSchool) || 0);

          // Get pricing settings from supplier
          const pricingSettings = supplierContextDoc?.pricingSettings || { markup: 5, handlesShipping: false };
          const markupMultiplier = 1 + (pricingSettings.markup / 100);
          const handlesShipping = pricingSettings.handlesShipping || false;

          // If supplier handles shipping, delivery cost should be 0 for price calculation
          const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCostValue;

          let basePriceComponent = 0;
          if (!Number.isNaN(pricePickupValue) && pricePickupValue > 0) {
            basePriceComponent = pricePickupValue * markupMultiplier;
          } else {
            const productPriceValue = Number(product.price);
            if (!Number.isNaN(productPriceValue) && productPriceValue > 0) {
              basePriceComponent = Math.max(0, productPriceValue - effectiveDeliveryCost);
            }
          }

          // Round down to nearest 5 cents for school cost
          const totalPrice = basePriceComponent + effectiveDeliveryCost;
          const roundedPrice = Math.floor(totalPrice * 20) / 20;
          // Use the rounded price directly (already rounded to 2 decimals by Math.floor)
          const computedAcquisitionCost = roundedPrice;

          // IMPORTANT: product.price is the ROUNDED price and is the source of truth
          // Always prefer product.price over computed values when available
          const storedPriceValue = Number(product.price);
          const hasStoredPrice = !Number.isNaN(storedPriceValue) && storedPriceValue > 0;

          // product.price is already rounded to nearest 5 cents (source of truth)
          // Use it directly if available, otherwise use computed value
          const realSchoolPrice = hasStoredPrice ? storedPriceValue : computedAcquisitionCost;

          const storedCostValue = Number(product.cost);
          const hasStoredCost = !Number.isNaN(storedCostValue) && storedCostValue > 0;
          // If using stored cost, ensure it's also rounded to nearest 5 cents
          const normalizedCost = hasStoredCost ? (Math.floor(storedCostValue * 20) / 20) : realSchoolPrice;

          // finalPrice is the selling price (may include custom pricing from campaign)
          // For acquisition cost, always use realSchoolPrice (product.price or computed rounded price)
          let finalPrice = hasStoredPrice
            ? roundToTwoDecimals(storedPriceValue)
            : computedAcquisitionCost;
          let hasCustomPrice = false;

          // Check for custom pricing in active campaign
          if (activeCampaign && activeCampaign.customPrices && activeCampaign.customPrices.length > 0) {
            const productIdStr = product._id.toString();
            const customPrice = activeCampaign.customPrices.find(cp => {
              if (!cp.productId) {
                console.log(`[products API] WARNING: customPrice entry has no productId`);
                return false;
              }

              // Handle ObjectId (Mongoose or MongoDB ObjectId)
              let cpProductId = null;
              if (cp.productId._id) {
                // Populated reference
                cpProductId = cp.productId._id.toString();
              } else if (cp.productId.toString && typeof cp.productId.toString === 'function') {
                // ObjectId instance
                cpProductId = cp.productId.toString();
              } else if (typeof cp.productId === 'string') {
                // Already a string
                cpProductId = cp.productId;
              } else {
                // Try to convert anyway
                try {
                  cpProductId = String(cp.productId);
                } catch (e) {
                  console.log(`[products API] ERROR converting productId:`, cp.productId, e);
                  return false;
                }
              }

              const matches = cpProductId === productIdStr;
              if (matches) {
                console.log(`[products API] Found matching customPrice for product ${productIdStr}: price ${cp.price}`);
              }
              return matches;
            });

            if (customPrice && customPrice.price !== undefined && customPrice.price !== null) {
              const customPriceValue = Number(customPrice.price);
              if (!Number.isNaN(customPriceValue) && customPriceValue >= 0) {
                finalPrice = roundToTwoDecimals(customPriceValue);
                hasCustomPrice = true;
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[products API] ✓ Applied custom price for product ${product._id.toString()} (${product.name}): ${storedPriceValue} -> ${finalPrice}`);
                }
              } else {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`[products API] Invalid custom price for product ${product._id.toString()}: ${customPrice.price}`);
                }
              }
            }
          }

          // Get attributes from product, ensuring all fields are present
          const productAttributes = product.attributes || {};

          // Debug logging for all products in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`[API GET] Product ${product._id.toString()} (${product.name}):`, {
              'product.attributes exists': !!product.attributes,
              'product.attributes type': typeof product.attributes,
              'productAttributes': productAttributes,
              'productAttributes keys': Object.keys(productAttributes),
              'product.freezable': product.freezable
            });
          }

          // Debug logging for specific product
          if (product._id.toString() === '671efae6111752b9d6c8db12') {
            console.log('[API GET] Product attributes from DB:', JSON.stringify(productAttributes));
            console.log('[API GET] Product attributes type:', typeof productAttributes);
            console.log('[API GET] Product attributes quebecProduct:', productAttributes.quebecProduct);
            console.log('[API GET] Product raw:', JSON.stringify(product));
          }

          const sanitizedAttributes = {
            freezable: productAttributes.freezable !== undefined ? productAttributes.freezable : (product.freezable !== undefined ? product.freezable : false),
            glutenFree: productAttributes.glutenFree !== undefined ? productAttributes.glutenFree : false,
            vegetarian: productAttributes.vegetarian !== undefined ? productAttributes.vegetarian : false,
            vegan: productAttributes.vegan !== undefined ? productAttributes.vegan : false,
            nutFree: productAttributes.nutFree !== undefined ? productAttributes.nutFree : false,
            halal: productAttributes.halal !== undefined ? productAttributes.halal : false,
            kosher: productAttributes.kosher !== undefined ? productAttributes.kosher : false,
            organic: productAttributes.organic !== undefined ? productAttributes.organic : false,
            quebecProduct: productAttributes.quebecProduct !== undefined ? productAttributes.quebecProduct : false,
            allergens: productAttributes.allergens !== undefined ? String(productAttributes.allergens) : ''
          };

          // Debug logging for all products in development
          if (process.env.NODE_ENV === 'development') {
            const hasAnyAttr = Object.values(sanitizedAttributes).some((val, idx) => {
              if (idx === 9) return val && String(val).trim().length > 0; // allergens
              return val === true;
            });
            console.log(`[API GET] Product ${product._id.toString()} sanitized attributes:`, {
              sanitizedAttributes,
              hasAnyAttribute: hasAnyAttr
            });
          }

          // Debug logging for specific product
          if (product._id.toString() === '671efae6111752b9d6c8db12') {
            console.log('[API GET] Sanitized attributes:', JSON.stringify(sanitizedAttributes));
          }

          const recommendedRetailRaw = product.recommendedRetailPrice;
          const normalizedRecommendedRetailPrice =
            recommendedRetailRaw !== undefined &&
              recommendedRetailRaw !== null &&
              String(recommendedRetailRaw).trim() !== ''
              ? Number(recommendedRetailRaw)
              : null;

          return {
            id: product._id.toString(),
            name: sanitizeHtml(String(product.name || '')),
            description: sanitizeHtml(String(product.description || '')),
            price: Number(finalPrice) || 0, // Use finalPrice instead of product.price (may include custom pricing)
            originalPrice: hasStoredPrice ? roundToTwoDecimals(storedPriceValue) : computedAcquisitionCost, // Reference school price before adjustments
            pricePickup: Number(product.pricePickup) || 0, // Price pickup at factory
            deliveryCostToSchool: deliveryCostValue, // Delivery cost to school (stored or estimated)
            cost: normalizedCost,
            acquisitionCost: computedAcquisitionCost,
            recommendedRetailPrice: normalizedRecommendedRetailPrice,
            image: sanitizeHtml(String(product.image || '')),
            ingredientsImage: sanitizeHtml(String(product.ingredientsImage || '')),
            nutritionImage: sanitizeHtml(String(product.nutritionImage || '')),
            school: product.school,
            isDefault: Boolean(product.isDefault),
            productId: String(product.productId || ''),
            order: Number(product.order) || 0,
            hasCustomPrice: hasCustomPrice,
            attributes: sanitizedAttributes,
            freezable: product.freezable, // Keep for backward compatibility
            // Logistical information needed for delivery cost calculation
            pallet: product.pallet || { ti: 0, hi: 0 }, // Pallet configuration (ti = tiers/layers, hi = boxes per layer)
            casePack: String(product.casePack || '') // Products per box
          };
        } catch (error) {
          console.error('Error sanitizing product:', error);
          return null;
        }
      }).filter(Boolean); // Remove any null values

      // Sanitize bundles and add them to the products list
      const sanitizedBundles = bundles.map((bundle) => {
        try {
          const bundleDeliveryCost = (supplierAddressString && schoolAddressString)
            ? deriveDeliveryCostValue(bundle, supplierAddressString, schoolAddressString)
            : roundToTwoDecimals(Number(bundle.deliveryCostToSchool) || 0);

          const bundleStoredCost = Number(bundle.cost);
          const hasBundleStoredCost = !Number.isNaN(bundleStoredCost) && bundleStoredCost > 0;
          // Get pricing settings from supplier (reuse from above)
          const bundlePricingSettings = supplierContextDoc?.pricingSettings || { markup: 5, handlesShipping: false };
          const bundleMarkupMultiplier = 1 + (bundlePricingSettings.markup / 100);
          const bundleHandlesShipping = bundlePricingSettings.handlesShipping || false;

          // If supplier handles shipping, delivery cost should be 0 for price calculation
          const effectiveBundleDeliveryCost = bundleHandlesShipping ? 0 : bundleDeliveryCost;

          const bundlePricePickup = Number(bundle.pricePickup);
          let bundleBaseComponent = 0;
          if (!Number.isNaN(bundlePricePickup) && bundlePricePickup > 0) {
            bundleBaseComponent = bundlePricePickup * bundleMarkupMultiplier;
          } else {
            const bundlePriceValue = Number(bundle.price);
            if (!Number.isNaN(bundlePriceValue) && bundlePriceValue > 0) {
              bundleBaseComponent = Math.max(0, bundlePriceValue - effectiveBundleDeliveryCost);
            }
          }

          // Round down to nearest 5 cents for school cost
          const bundleTotalPrice = bundleBaseComponent + effectiveBundleDeliveryCost;
          const bundleRoundedPrice = Math.floor(bundleTotalPrice * 20) / 20;
          // Use the rounded price directly (already rounded to 2 decimals by Math.floor)
          const bundleAcquisitionCost = bundleRoundedPrice;
          // If using stored cost, ensure it's also rounded to nearest 5 cents
          const normalizedBundleCost = hasBundleStoredCost ? (Math.floor(bundleStoredCost * 20) / 20) : bundleAcquisitionCost;
          const bundleStoredPriceValue = Number(bundle.price);
          const hasBundleStoredPrice = !Number.isNaN(bundleStoredPriceValue) && bundleStoredPriceValue > 0;
          let bundleDerivedPrice = hasBundleStoredPrice
            ? roundToTwoDecimals(bundleStoredPriceValue)
            : bundleAcquisitionCost;
          let hasBundleCustomPrice = false;

          // Check for custom pricing in active campaign (same logic as products)
          if (activeCampaign && activeCampaign.customPrices && activeCampaign.customPrices.length > 0) {
            const bundleIdStr = bundle._id.toString();

            // Filter out null/undefined productIds first
            const validCustomPrices = activeCampaign.customPrices.filter(cp => cp.productId != null);

            if (validCustomPrices.length === 0) {
              console.log(`[products API] ⚠ No valid customPrices found (all have null productId) for campaign ${activeCampaign._id}`);
            }

            // Debug: Log all customPrice IDs to help diagnose matching issues
            if (bundle.name && bundle.name.includes('Forfait')) {
              console.log(`[products API] 🔍 Looking for bundle custom price. Bundle ID: ${bundleIdStr}, Bundle name: ${bundle.name}`);
              console.log(`[products API] 🔍 All customPrice IDs in campaign (${validCustomPrices.length} total):`, validCustomPrices.map(cp => {
                let id = null;
                if (cp.productId._id) id = cp.productId._id.toString();
                else if (cp.productId.toString && typeof cp.productId.toString === 'function') id = cp.productId.toString();
                else if (typeof cp.productId === 'string') id = cp.productId;
                return { id: id || 'unknown', price: cp.price };
              }));

              // Check if bundle ID matches any customPrice ID
              const matchingCustomPrice = validCustomPrices.find(cp => {
                let id = null;
                if (cp.productId._id) id = cp.productId._id.toString();
                else if (cp.productId.toString && typeof cp.productId.toString === 'function') id = cp.productId.toString();
                else if (typeof cp.productId === 'string') id = cp.productId;
                return id === bundleIdStr;
              });

              if (matchingCustomPrice) {
                console.log(`[products API] ✓ Found matching customPrice for bundle! ID: ${bundleIdStr}, Price: ${matchingCustomPrice.price}`);
              } else {
                console.log(`[products API] ✗ No matching customPrice found for bundle ID: ${bundleIdStr}`);
              }
            }

            const customPrice = validCustomPrices.find(cp => {
              // Handle ObjectId (Mongoose or MongoDB ObjectId)
              let cpProductId = null;
              if (cp.productId._id) {
                // Populated reference
                cpProductId = cp.productId._id.toString();
              } else if (cp.productId.toString && typeof cp.productId.toString === 'function') {
                // ObjectId instance
                cpProductId = cp.productId.toString();
              } else if (typeof cp.productId === 'string') {
                // Already a string
                cpProductId = cp.productId;
              } else {
                // Try to convert anyway
                try {
                  cpProductId = String(cp.productId);
                } catch (e) {
                  return false;
                }
              }

              return cpProductId === bundleIdStr;
            });

            if (customPrice && customPrice.price !== undefined && customPrice.price !== null) {
              const customPriceValue = Number(customPrice.price);
              if (!Number.isNaN(customPriceValue) && customPriceValue >= 0) {
                bundleDerivedPrice = roundToTwoDecimals(customPriceValue);
                hasBundleCustomPrice = true;
                console.log(`[products API] ✓ Applied custom price for bundle ${bundle._id.toString()} (${bundle.name}): ${bundleStoredPriceValue} -> ${bundleDerivedPrice}`);
              } else {
                console.log(`[products API] ✗ Custom price found but invalid for bundle ${bundle._id.toString()}:`, customPrice.price);
              }
            } else {
              console.log(`[products API] ✗ No custom price found for bundle ${bundle._id.toString()} (${bundle.name}). Bundle ID: ${bundleIdStr}, CustomPrices count: ${activeCampaign.customPrices.length}, Valid customPrices: ${validCustomPrices.length}`);
              if (validCustomPrices.length > 0) {
                console.log(`[products API] Sample customPrice IDs:`, validCustomPrices.slice(0, 5).map(cp => {
                  let id = null;
                  if (cp.productId._id) id = cp.productId._id.toString();
                  else if (cp.productId.toString && typeof cp.productId.toString === 'function') id = cp.productId.toString();
                  else if (typeof cp.productId === 'string') id = cp.productId;
                  return { id: id || 'unknown', price: cp.price };
                }));
              }
            }
          }

          const bundleRecommendedRaw = bundle.recommendedRetailPrice;
          const normalizedBundleRecommended =
            bundleRecommendedRaw !== undefined &&
              bundleRecommendedRaw !== null &&
              String(bundleRecommendedRaw).trim() !== ''
              ? Number(bundleRecommendedRaw)
              : null;

          return {
            id: bundle._id.toString(),
            name: sanitizeHtml(String(bundle.name || '')),
            description: sanitizeHtml(String(bundle.description || '')),
            price: bundleDerivedPrice,
            originalPrice: hasBundleStoredPrice ? roundToTwoDecimals(bundleStoredPriceValue) : bundleDerivedPrice,
            pricePickup: Number(bundle.pricePickup) || 0,
            deliveryCostToSchool: bundleDeliveryCost,
            cost: normalizedBundleCost,
            // IMPORTANT: acquisitionCost is the REAL rounded price for schools (source of truth)
            // This is bundle.price (already rounded) or bundleComputedAcquisitionCost (rounded)
            acquisitionCost: bundleRealSchoolPrice,
            recommendedRetailPrice: normalizedBundleRecommended,
            image: sanitizeHtml(String(bundle.image || '')),
            ingredientsImage: '',
            nutritionImage: '',
            school: null,
            isDefault: false,
            productId: `BUNDLE-${bundle._id.toString().slice(-6)}`,
            order: Number(bundle.order) || 0,
            hasCustomPrice: hasBundleCustomPrice,
            attributes: bundle.attributes || {},
            freezable: bundle.attributes?.freezable || false,
            pallet: bundle.pallet || { ti: 0, hi: 0 },
            casePack: String(bundle.casePack || ''),
            isBundle: true,
            includedProducts: bundle.includedProducts || []
          };
        } catch (error) {
          console.error('Error sanitizing bundle:', error);
          return null;
        }
      }).filter(Boolean);

      // Combine products and bundles, sorted by order
      const allItems = [...sanitizedProducts, ...sanitizedBundles].sort((a, b) => {
        const orderA = a.order || 0;
        const orderB = b.order || 0;
        if (orderA !== orderB) return orderA - orderB;
        return 0;
      });

      res.status(200).json({
        total: total + sanitizedBundles.length,
        page: pageNumber,
        pages: Math.ceil((total + sanitizedBundles.length) / limitNumber),
        products: allItems,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);

      // Return empty array instead of error to prevent blank screen
      res.status(200).json({
        total: 0,
        page: 1,
        pages: 0,
        products: [],
      });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        name,
        description,
        cost,
        price,
        type,
        image,
        isDefault,
        productId,
        ingredientsImage,
        nutritionImage,
        attributes,
      } = req.body;

      // Validate required fields
      if (!name || !description || !price || !cost || !image) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Auto-generate productId if not provided
      let finalProductId = productId;
      if (!finalProductId) {
        // Generate a unique ID by combining timestamp and random number
        finalProductId = `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }

      // Check if productId already exists
      const existingProduct = await Product.findOne({ productId: finalProductId });
      if (existingProduct) {
        return res.status(400).json({ message: 'Product ID already exists' });
      }

      const sanitizeOptionalUrl = (value, fieldName) => {
        if (value === null || value === undefined || value === '') {
          return '';
        }
        if (typeof value !== 'string') {
          throw new Error(`Invalid type for ${fieldName}.`);
        }
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return '';
        }
        if (!validator.isURL(trimmed, { protocols: ['http', 'https'], require_protocol: false })) {
          throw new Error(`${fieldName === 'ingredientsImage' ? 'Image des ingrédients' : 'Image nutritive'} must be a valid URL.`);
        }
        return sanitizeHtml(trimmed, { allowedTags: [] });
      };

      let sanitizedIngredientsImage = '';
      let sanitizedNutritionImage = '';

      try {
        sanitizedIngredientsImage = sanitizeOptionalUrl(ingredientsImage, 'ingredientsImage');
        sanitizedNutritionImage = sanitizeOptionalUrl(nutritionImage, 'nutritionImage');
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }

      // Get the highest order value to place new product at the end
      const maxOrderProduct = await Product.findOne().sort({ order: -1 }).lean();
      const nextOrder = maxOrderProduct ? (maxOrderProduct.order + 1) : 0;

      const productData = {
        name,
        description,
        cost,
        price,
        type,
        image,
        isDefault,
        productId: finalProductId,
        order: nextOrder,
        ingredientsImage: sanitizedIngredientsImage,
        nutritionImage: sanitizedNutritionImage,
      };

      // Add attributes if provided
      if (attributes && typeof attributes === 'object') {
        productData.attributes = {
          freezable: attributes.freezable !== undefined ? attributes.freezable : false,
          glutenFree: attributes.glutenFree || false,
          vegetarian: attributes.vegetarian || false,
          vegan: attributes.vegan || false,
          nutFree: attributes.nutFree || false,
          halal: attributes.halal || false,
          kosher: attributes.kosher || false,
          organic: attributes.organic || false,
          quebecProduct: attributes.quebecProduct || false,
          allergens: attributes.allergens ? sanitizeHtml(String(attributes.allergens).trim(), { allowedTags: [] }).substring(0, 500) : ''
        };
      }

      const product = await Product.create(productData);

      res.status(201).json({
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        cost: product.cost,
        image: product.image,
        productId: product.productId,
        isDefault: product.isDefault,
        order: product.order,
        ingredientsImage: product.ingredientsImage || '',
        nutritionImage: product.nutritionImage || ''
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ message: 'Error creating product' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Méthode ${req.method} non autorisée.`);
  }
}
