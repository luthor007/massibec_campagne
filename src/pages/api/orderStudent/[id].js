import dbConnect from '../../../lib/mongodb';
import OrderStudent from '../../../models/OrderStudent';

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      if (!id) {
        return res.status(400).json({ message: 'Order ID is required' });
      }

      // Find the order first to get the school ID
      const order = await OrderStudent.findById(id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Delete the order
      await OrderStudent.findByIdAndDelete(id);

      res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Error deleting order' });
    }
  } else if (req.method === 'PATCH') {
    try {
      if (!id) {
        return res.status(400).json({ message: 'Order ID is required' });
      }

      const { products } = req.body;

      // Calculate new totals based on products
      const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0);
      const totalAmount = products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
      const studentBenefit = products.reduce((sum, product) => sum + product.studentBenefit, 0);
      const organizationBenefit = products.reduce((sum, product) => sum + product.organizationBenefit, 0);
      const raffleBenefit = products.reduce((sum, product) => sum + product.raffleBenefit, 0);

      const updatedOrder = await OrderStudent.findByIdAndUpdate(
        id,
        {
          products,
          totalUnits,
          totalAmount,
          studentBenefit,
          organizationBenefit,
          raffleBenefit,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.status(200).json({ message: 'Order updated successfully', order: updatedOrder });
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ message: 'Error updating order' });
    }
  } else {
    res.setHeader('Allow', ['DELETE', 'PATCH']);
    res.status(405).json({ message: 'Method not allowed' });
  }
} 