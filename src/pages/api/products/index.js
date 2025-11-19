import connectDB from '../../../lib/mongodb';
import Product from '../../../models/Product';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 10, search = '', schoolId, campaignId } = req.query;

      // Convert params to numbers
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);

      // Query object with search conditions
      let queryConditions = [];

      // Add search conditions if search term is provided
      if (search && search.trim().length > 0) {
        queryConditions.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ]
        });
      }

      // Filter by campaign if campaignId is provided
      // Products with empty campaigns array are available for all campaigns (backward compatibility)
      if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
        queryConditions.push({
          $or: [
            { campaigns: { $exists: false } }, // Products without campaigns field (legacy)
            { campaigns: { $size: 0 } }, // Products with empty campaigns array (available everywhere)
            { campaigns: mongoose.Types.ObjectId(campaignId) } // Products associated with this campaign
          ]
        });
      }

      // Build final query
      let query = queryConditions.length > 0 ? { $and: queryConditions } : {};

      // Products are universal, so we don't filter by school
      // But we keep the schoolId parameter for backward compatibility
      // if (schoolId && mongoose.Types.ObjectId.isValid(schoolId)) {
      //   query.school = schoolId;
      // }

      // Fetch products with pagination - handle corrupted data gracefully
      let products = [];
      try {
        // First, try to get product count
        const total = await Product.countDocuments({});

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
                return product;
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

      // Get campaign for custom pricing - prioritize campaignId over schoolId
      let activeCampaign = null;

      if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
        // Directly fetch campaign by ID (campaign-based approach)
        // Populate customPrices.productId just like in /api/campaigns/index.js
        activeCampaign = await Campaign.findById(campaignId)
          .populate('customPrices.productId', '_id')
          .lean();

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
        const school = await School.findById(schoolId);
        if (school) {
          // Try to find campaign in Campaign collection first
          activeCampaign = await Campaign.findOne({
            school: schoolId,
            isActive: true,
            status: { $in: ['approved', 'active', 'pending_approval', 'pending_school_approval'] }
          })
            .populate('customPrices.productId', '_id')
            .lean();

          console.log(`[products API] Fetched campaign by schoolId ${schoolId}, customPrices count:`, activeCampaign?.customPrices?.length || 0);

          // If not found, fallback to school's embedded campaigns
          if (!activeCampaign) {
            const schoolCampaign = school.campaigns?.find(campaign => campaign.isActive);
            if (schoolCampaign) {
              activeCampaign = schoolCampaign;
            }
          }
        }
      }

      // Get total number of products for pagination
      const total = await Product.countDocuments(query);

      // Sanitize output and apply custom pricing
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
          let finalPrice = product.price;
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
              finalPrice = customPrice.price;
              hasCustomPrice = true;
              console.log(`[products API] ✓ Applied custom price for product ${product._id.toString()}: ${product.price} -> ${finalPrice}`);
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

          return {
            id: product._id.toString(),
            name: sanitizeHtml(String(product.name || '')),
            description: sanitizeHtml(String(product.description || '')),
            price: Number(finalPrice) || 0, // Use finalPrice instead of product.price
            originalPrice: Number(product.price) || 0, // Keep original price for reference
            cost: Number(product.cost) || 0,
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
            campaigns: product.campaigns ? product.campaigns.map(c => c.toString ? c.toString() : String(c)) : []
          };
        } catch (error) {
          console.error('Error sanitizing product:', error);
          return null;
        }
      }).filter(Boolean); // Remove any null values

      res.status(200).json({
        total,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber),
        products: sanitizedProducts,
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
        campaigns,
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

      // Add campaigns if provided (array of campaign IDs)
      if (campaigns && Array.isArray(campaigns)) {
        // Validate that all campaign IDs are valid MongoDB ObjectIds
        const mongoose = require('mongoose');
        const validCampaignIds = campaigns.filter(campaignId => {
          return mongoose.Types.ObjectId.isValid(campaignId);
        });
        productData.campaigns = validCampaignIds;
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
