// pages/api/products/[id].js

import connectDB from '../../../lib/mongodb';
import Product from '../../../models/Product';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await connectDB();

  const { id } = req.query;

  // Validate the MongoDB ObjectId
  if (!validator.isMongoId(id)) {
    return res.status(400).json({ message: 'Invalid product ID.' });
  }

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (req.method === 'GET') {
      // Sanitize and respond with the product
      const sanitizedProduct = {
        id: product._id.toString(),
        name: sanitizeHtml(product.name),
        description: sanitizeHtml(product.description),
        price: product.price,
        cost: product.cost,
        image: sanitizeHtml(product.image),
        ingredientsImage: sanitizeHtml(product.ingredientsImage || ''),
        nutritionImage: sanitizeHtml(product.nutritionImage || ''),
        isDefault: product.isDefault,
        productId: product.productId,
        order: product.order || 0,
        attributes: product.attributes || {
          freezable: product.freezable !== undefined ? product.freezable : false,
          glutenFree: false,
          vegetarian: false,
          vegan: false,
          nutFree: false,
          halal: false,
          kosher: false,
          organic: false,
          quebecProduct: false,
          allergens: ''
        },
        freezable: product.freezable, // Keep for backward compatibility
        campaigns: product.campaigns ? product.campaigns.map(c => c.toString ? c.toString() : String(c)) : []
      };

      return res.status(200).json(sanitizedProduct);
    } else if (req.method === 'PUT') {
      let { name, description, price, cost, image, isDefault, productId, ingredientsImage, nutritionImage, attributes, campaigns } = req.body;

      // Check if this is a partial update (only attributes or only campaigns)
      const isPartialUpdate = (attributes && Object.keys(req.body).length === 1) ||
        (campaigns !== undefined && Object.keys(req.body).length === 1);

      // Basic validation - check required fields exist and are valid types (skip if partial update)
      if (!isPartialUpdate) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return res.status(400).json({ message: 'Product name is required and cannot be empty.' });
        }

        if (typeof price === 'undefined' || price === null) {
          return res.status(400).json({ message: 'Price is required.' });
        }

        if (typeof cost === 'undefined' || cost === null) {
          return res.status(400).json({ message: 'Cost is required.' });
        }
      }

      // Only validate and sanitize other fields if not a partial update
      let sanitizedIngredientsImage = '';
      let sanitizedNutritionImage = '';

      if (!isPartialUpdate) {
        // Trim and validate the name
        name = name.trim();

        // Check if name is valid (not just whitespace, not too long)
        if (name.length === 0 || name.length > 200) {
          return res.status(400).json({ message: 'Product name must be between 1 and 200 characters.' });
        }

        // Check for dangerous content but allow any characters
        // Remove only HTML/script tags, preserve the actual content
        name = sanitizeHtml(name, { allowedTags: [] }); // Strip only tags

        // If sanitization left nothing, reject it
        if (!name || name.trim().length === 0) {
          return res.status(400).json({ message: 'Product name contains only invalid characters.' });
        }

        // Validate and sanitize description
        if (description && typeof description === 'string') {
          description = description.trim();
          if (description.length > 1000) {
            return res.status(400).json({ message: 'Description must be 1000 characters or less.' });
          }
          description = sanitizeHtml(description, { allowedTags: [] }); // Strip tags, keep text
        }

        // Validate and sanitize image URL
        if (image && typeof image === 'string') {
          image = image.trim();
          if (image.length > 0 && !validator.isURL(image, { protocols: ['http', 'https'], require_protocol: false })) {
            return res.status(400).json({ message: 'Image must be a valid URL.' });
          }
          image = sanitizeHtml(image, { allowedTags: [] });
        }

        const sanitizeOptionalUrl = (value, fieldName) => {
          if (value === null || value === undefined || value === '') {
            return '';
          }
          if (typeof value !== 'string') {
            throw new Error(`${fieldName} must be a string.`);
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

        try {
          sanitizedIngredientsImage = sanitizeOptionalUrl(ingredientsImage, 'ingredientsImage');
          sanitizedNutritionImage = sanitizeOptionalUrl(nutritionImage, 'nutritionImage');
        } catch (validationError) {
          return res.status(400).json({ message: validationError.message });
        }
      }

      // Only validate and update other fields if not a partial update
      if (!isPartialUpdate) {
        // Validate productId
        if (!productId || typeof productId !== 'string') {
          return res.status(400).json({ message: 'Product ID is required.' });
        }
        productId = productId.trim();

        // Check if new productId already exists (excluding current product)
        const existingProduct = await Product.findOne({
          productId,
          _id: { $ne: id }
        });

        if (existingProduct) {
          return res.status(400).json({ message: 'Product ID already exists' });
        }

        // Validate price and cost are valid numbers
        if (!validator.isFloat(price.toString(), { min: 0 })) {
          return res.status(400).json({ message: 'Price must be a positive number.' });
        }

        if (!validator.isFloat(cost.toString(), { min: 0 })) {
          return res.status(400).json({ message: 'Cost must be a positive number.' });
        }

        // Update the product fields - ensure all values are properly set
        product.name = String(name); // Convert to string explicitly
        product.price = parseFloat(price);
        product.cost = parseFloat(cost);
        product.isDefault = !!isDefault;
        product.productId = String(productId); // Convert to string explicitly

        // Only update optional fields if they are provided and valid
        if (description) {
          product.description = String(description);
        }
        if (image) {
          product.image = String(image);
        }
        // Always update ingredientsImage and nutritionImage (they can be empty strings)
        product.ingredientsImage = sanitizedIngredientsImage || '';
        product.nutritionImage = sanitizedNutritionImage || '';

        // Update campaigns if provided
        if (campaigns !== undefined) {
          if (Array.isArray(campaigns)) {
            // Validate that all campaign IDs are valid MongoDB ObjectIds
            const validCampaignIds = campaigns.filter(campaignId => {
              return mongoose.Types.ObjectId.isValid(campaignId);
            });
            product.campaigns = validCampaignIds;
          } else {
            // If campaigns is explicitly set to null or empty, clear the array
            product.campaigns = [];
          }
        }
      }

      let reloadedProductAfterAttributeUpdate = null;

      // Update attributes if provided - use updateOne to force save nested objects
      if (attributes && typeof attributes === 'object') {
        console.log('[API PUT] Updating attributes for product:', id);
        console.log('[API PUT] Received attributes:', JSON.stringify(attributes));
        console.log('[API PUT] Current product attributes before update:', JSON.stringify(product.attributes));

        // Create a new attributes object with all fields explicitly set
        const newAttributes = {
          freezable: typeof attributes.freezable === 'boolean' ? attributes.freezable : (product.attributes?.freezable !== undefined ? product.attributes.freezable : false),
          glutenFree: typeof attributes.glutenFree === 'boolean' ? attributes.glutenFree : (product.attributes?.glutenFree !== undefined ? product.attributes.glutenFree : false),
          vegetarian: typeof attributes.vegetarian === 'boolean' ? attributes.vegetarian : (product.attributes?.vegetarian !== undefined ? product.attributes.vegetarian : false),
          vegan: typeof attributes.vegan === 'boolean' ? attributes.vegan : (product.attributes?.vegan !== undefined ? product.attributes.vegan : false),
          nutFree: typeof attributes.nutFree === 'boolean' ? attributes.nutFree : (product.attributes?.nutFree !== undefined ? product.attributes.nutFree : false),
          halal: typeof attributes.halal === 'boolean' ? attributes.halal : (product.attributes?.halal !== undefined ? product.attributes.halal : false),
          kosher: typeof attributes.kosher === 'boolean' ? attributes.kosher : (product.attributes?.kosher !== undefined ? product.attributes.kosher : false),
          organic: typeof attributes.organic === 'boolean' ? attributes.organic : (product.attributes?.organic !== undefined ? product.attributes.organic : false),
          quebecProduct: typeof attributes.quebecProduct === 'boolean' ? attributes.quebecProduct : (product.attributes?.quebecProduct !== undefined ? product.attributes.quebecProduct : false),
          allergens: typeof attributes.allergens === 'string'
            ? sanitizeHtml(attributes.allergens.trim(), { allowedTags: [] }).substring(0, 500)
            : (product.attributes?.allergens !== undefined ? String(product.attributes.allergens) : '')
        };

        console.log('[API PUT] New attributes to save:', JSON.stringify(newAttributes));

        // Use updateOne directly to force update nested object, bypassing Mongoose minimize
        const updateResult = await Product.updateOne(
          { _id: id },
          { $set: { attributes: newAttributes } },
          { runValidators: false, strict: false } // Allow updates even if schema cache is outdated
        );
        console.log('[API PUT] Update result:', updateResult);
        console.log('[API PUT] Attributes updated directly in MongoDB using updateOne');

        // Reload the product to get updated attributes
        reloadedProductAfterAttributeUpdate = await Product.findById(id).lean();
        console.log('[API PUT] Reloaded product attributes:', JSON.stringify(reloadedProductAfterAttributeUpdate?.attributes));

        // Update the product object for the rest of the save
        product.attributes = newAttributes;
        product.markModified('attributes');

        // If this was an attributes-only update, respond immediately without saving other fields
        if (isPartialUpdate && !campaigns) {
          return res.status(200).json(buildSafeProductResponse(reloadedProductAfterAttributeUpdate || product));
        }
      }

      // Update campaigns if provided (can be done in partial update)
      if (campaigns !== undefined) {
        if (Array.isArray(campaigns)) {
          // Validate that all campaign IDs are valid MongoDB ObjectIds
          const validCampaignIds = campaigns.filter(campaignId => {
            return mongoose.Types.ObjectId.isValid(campaignId);
          });
          product.campaigns = validCampaignIds;
        } else {
          // If campaigns is explicitly set to null or empty, clear the array
          product.campaigns = [];
        }
      }

      // If this was a campaigns-only update, save and respond
      if (isPartialUpdate && campaigns !== undefined && !attributes) {
        try {
          const updatedProduct = await product.save();
          return res.status(200).json(buildSafeProductResponse(updatedProduct));
        } catch (saveError) {
          console.error('Error saving product campaigns:', saveError);
          return res.status(500).json({
            message: 'Error saving product campaigns.'
          });
        }
      }

      // Save the updated product with error handling
      try {
        const updatedProduct = await product.save();
        console.log('[API PUT] Product saved successfully. Updated attributes:', JSON.stringify(updatedProduct.attributes));

        // Ensure all response fields are safe strings
        return res.status(200).json(buildSafeProductResponse(updatedProduct));
      } catch (saveError) {
        console.error('Error saving product:', saveError);

        // Check if it's an encoding issue
        if (saveError.message && saveError.message.includes('Invalid UTF-8')) {
          return res.status(400).json({
            message: 'Product name contains invalid characters. Please use only standard text characters.'
          });
        }

        return res.status(500).json({
          message: 'Error saving product. Please check that all fields contain valid data.'
        });
      }
    } else if (req.method === 'DELETE') {
      await Product.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Product deleted successfully.' });
    } else {
      // Method Not Allowed
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling product:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

function buildSafeProductResponse(productDoc) {
  if (!productDoc) {
    return null;
  }

  const attributes =
    productDoc.attributes ||
    (productDoc.freezable !== undefined
      ? {
        freezable: productDoc.freezable,
        glutenFree: false,
        vegetarian: false,
        vegan: false,
        nutFree: false,
        halal: false,
        kosher: false,
        organic: false,
        quebecProduct: false,
        allergens: ''
      }
      : {
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
      });

  return {
    id: productDoc._id.toString(),
    name: sanitizeHtml(String(productDoc.name || '')),
    description: productDoc.description ? sanitizeHtml(String(productDoc.description)) : null,
    price: Number(productDoc.price || 0),
    cost: Number(productDoc.cost || 0),
    image: productDoc.image ? sanitizeHtml(String(productDoc.image)) : null,
    ingredientsImage: productDoc.ingredientsImage ? sanitizeHtml(String(productDoc.ingredientsImage)) : '',
    nutritionImage: productDoc.nutritionImage ? sanitizeHtml(String(productDoc.nutritionImage)) : '',
    isDefault: Boolean(productDoc.isDefault),
    productId: String(productDoc.productId || ''),
    order: Number(productDoc.order) || 0,
    attributes,
    freezable: productDoc.freezable,
    campaigns: productDoc.campaigns ? productDoc.campaigns.map(c => c.toString ? c.toString() : String(c)) : []
  };
}
