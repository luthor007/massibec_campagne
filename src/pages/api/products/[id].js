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
      };

      res.status(200).json(sanitizedProduct);
    } else if (req.method === 'PUT') {
      let { name, description, price, cost, image, isDefault, productId } = req.body;

      // Check if new productId already exists (excluding current product)
      const existingProduct = await Product.findOne({ 
        productId, 
        _id: { $ne: id } 
      });
      
      if (existingProduct) {
        return res.status(400).json({ message: 'Product ID already exists' });
      }

      // Basic validation
      if (!name || typeof price === 'undefined' || typeof cost === 'undefined') {
        return res.status(400).json({ message: 'Name, price and cost are required.' });
      }

      // Sanitize inputs that exist
      name = sanitizeHtml(name.trim());
      if (description) {
        description = sanitizeHtml(description.trim());
      }
      if (image) {
        image = sanitizeHtml(image.trim());
      }

      // Validate sanitized inputs
      if (!validator.isLength(name, { min: 1, max: 100 })) {
        return res.status(400).json({ message: 'Name must be between 1 and 100 characters.' });
      }

      if (description && !validator.isLength(description, { min: 1, max: 1000 })) {
        return res.status(400).json({ message: 'Description must be between 1 and 1000 characters.' });
      }

      if (!validator.isFloat(price.toString(), { min: 0 })) {
        return res.status(400).json({ message: 'Price must be a positive number.' });
      }

      if (!validator.isFloat(cost.toString(), { min: 0 })) {
        return res.status(400).json({ message: 'Cost must be a positive number.' });
      }

      if (image && !validator.isURL(image, { protocols: ['http', 'https'], require_protocol: true })) {
        return res.status(400).json({ message: 'Image must be a valid URL.' });
      }

      // Update the product fields
      product.name = name;
      product.price = parseFloat(price);
      product.cost = parseFloat(cost);
      product.isDefault = !!isDefault;
      product.productId = productId;

      // Only update optional fields if they are provided
      if (description) product.description = description;
      if (image) product.image = image;

      // Save the updated product
      const updatedProduct = await product.save();

      // Respond with the updated product
      res.status(200).json({
        id: updatedProduct._id.toString(),
        name: updatedProduct.name,
        description: updatedProduct.description,
        price: updatedProduct.price,
        cost: updatedProduct.cost,
        image: updatedProduct.image,
        isDefault: updatedProduct.isDefault,
        productId: updatedProduct.productId,
      });
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