import connectDB from '../../../lib/mongodb';
import Product from '../../../models/Product';

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'PUT') {
    try {
      const { products } = req.body;

      if (!Array.isArray(products)) {
        return res.status(400).json({ message: 'Products must be an array' });
      }

      // Update all products with their new order
      const updatePromises = products.map((product, index) => {
        return Product.findByIdAndUpdate(
          product.id,
          { order: index },
          { new: true }
        );
      });

      await Promise.all(updatePromises);

      res.status(200).json({ 
        message: 'Order updated successfully',
        count: products.length 
      });
    } catch (error) {
      console.error('Error updating product order:', error);
      res.status(500).json({ message: 'Error updating product order' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

