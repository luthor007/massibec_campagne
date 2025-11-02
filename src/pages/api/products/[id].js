// pages/api/products/[id].js

import connectDB from '../../../lib/mongodb';
import Product from '../../../models/Product';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';

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
        isDefault: product.isDefault,
        productId: product.productId,
        order: product.order || 0,
      };

      res.status(200).json(sanitizedProduct);
    } else if (req.method === 'PUT') {
      let { name, description, price, cost, image, isDefault, productId } = req.body;

      // Basic validation - check required fields exist and are valid types
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'Product name is required and cannot be empty.' });
      }

      if (typeof price === 'undefined' || price === null) {
        return res.status(400).json({ message: 'Price is required.' });
      }

      if (typeof cost === 'undefined' || cost === null) {
        return res.status(400).json({ message: 'Cost is required.' });
      }

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

      // Save the updated product with error handling
      try {
        const updatedProduct = await product.save();

      // Ensure all response fields are safe strings
      const safeResponse = {
        id: updatedProduct._id.toString(),
        name: String(updatedProduct.name || ''),
        description: updatedProduct.description ? String(updatedProduct.description) : null,
        price: Number(updatedProduct.price || 0),
        cost: Number(updatedProduct.cost || 0),
        image: updatedProduct.image ? String(updatedProduct.image) : null,
        isDefault: Boolean(updatedProduct.isDefault),
        productId: String(updatedProduct.productId || ''),
        order: Number(updatedProduct.order) || 0,
      };

        res.status(200).json(safeResponse);
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
      res.status(200).json({ message: 'Product deleted successfully.' });
    } else {
      // Method Not Allowed
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling product:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}