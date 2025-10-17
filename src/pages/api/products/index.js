import connectDB from '../../../lib/mongodb';
import Product from '../../../models/Product';
import School from '../../../models/School';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 10, search = '', schoolId } = req.query;

      // Convert params to numbers
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);

      // Query object with search conditions
      let query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      };

      // Add schoolId to query if provided
      if (schoolId && mongoose.Types.ObjectId.isValid(schoolId)) {
        query.school = schoolId;
      }

      // Fetch products with pagination
      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

      // Get school and active campaign for custom pricing
      let school = null;
      let activeCampaign = null;
      if (schoolId && mongoose.Types.ObjectId.isValid(schoolId)) {
        school = await School.findById(schoolId);
        if (school) {
          activeCampaign = school.campaigns?.find(campaign => campaign.isActive);
        }
      }

      // Get total number of products for pagination
      const total = await Product.countDocuments(query);

      // Sanitize output and apply custom pricing
      const sanitizedProducts = products.map((product) => {
        let finalPrice = product.price;
        
        // Check for custom pricing in active campaign
        if (activeCampaign && activeCampaign.customPrices) {
          const customPrice = activeCampaign.customPrices.find(
            cp => cp.productId && cp.productId.toString() === product._id.toString()
          );
          if (customPrice) {
            finalPrice = customPrice.price;
          }
        }

        return {
          id: product._id.toString(),
          name: sanitizeHtml(product.name),
          description: sanitizeHtml(product.description),
          price: finalPrice,
          originalPrice: product.price, // Keep original for reference
          cost: product.cost,
          image: sanitizeHtml(product.image),
          school: product.school,
          isDefault: product.isDefault,
          productId: product.productId,
          hasCustomPrice: activeCampaign && activeCampaign.customPrices && 
            activeCampaign.customPrices.some(cp => cp.productId && cp.productId.toString() === product._id.toString())
        };
      });

      res.status(200).json({
        total,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber),
        products: sanitizedProducts,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
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
        school,
        isDefault,
        productId,
      } = req.body;

      // Validate productId format if needed
      if (!productId || productId.length !== 6) {
        return res.status(400).json({ message: 'Invalid product ID format' });
      }

      // Check if productId already exists
      const existingProduct = await Product.findOne({ productId });
      if (existingProduct) {
        return res.status(400).json({ message: 'Product ID already exists' });
      }

      const product = await Product.create({
        name,
        description,
        cost,
        price,
        type,
        image,
        school,
        isDefault,
        productId,
      });

      res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ message: 'Error creating product' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Méthode ${req.method} non autorisée.`);
  }
}