import dbConnect from '@/lib/mongodb';
import { checkAdminAccess } from '@/lib/adminAuth';
import Supplier from '@/models/Supplier';

export default async function handler(req, res) {
    try {
        await dbConnect();

        // Check admin access
        const { authorized, message } = await checkAdminAccess(req);
        if (!authorized) {
            return res.status(403).json({ message });
        }

        if (req.method === 'GET') {
            // Get all suppliers with pricing settings
            const suppliers = await Supplier.find({})
                .select('name email status approved pricingSettings')
                .sort({ name: 1 })
                .lean();

            const formattedSuppliers = suppliers.map(supplier => ({
                _id: supplier._id.toString(),
                name: supplier.name,
                email: supplier.email,
                status: supplier.status,
                approved: supplier.approved,
                markup: supplier.pricingSettings?.markup ?? 5,
                handlesShipping: supplier.pricingSettings?.handlesShipping ?? false
            }));

            return res.status(200).json({ suppliers: formattedSuppliers });
        }

        if (req.method === 'PATCH') {
            const { supplierId, markup, handlesShipping } = req.body;

            if (!supplierId) {
                return res.status(400).json({ message: 'Supplier ID is required' });
            }

            // Validate markup
            let parsedMarkup = null;
            if (markup !== undefined) {
                parsedMarkup = parseFloat(markup);
                if (isNaN(parsedMarkup) || parsedMarkup < 0 || parsedMarkup > 100) {
                    return res.status(400).json({ message: 'Markup must be a number between 0 and 100' });
                }
            }

            // Validate handlesShipping
            if (handlesShipping !== undefined && typeof handlesShipping !== 'boolean') {
                return res.status(400).json({ message: 'handlesShipping must be a boolean' });
            }

            const supplier = await Supplier.findById(supplierId);
            if (!supplier) {
                return res.status(404).json({ message: 'Supplier not found' });
            }

            // Update pricing settings
            if (!supplier.pricingSettings) {
                supplier.pricingSettings = {};
            }

            if (markup !== undefined && parsedMarkup !== null) {
                supplier.pricingSettings.markup = parsedMarkup;
            }

            if (handlesShipping !== undefined) {
                supplier.pricingSettings.handlesShipping = handlesShipping;
            }

            await supplier.save();

            return res.status(200).json({
                message: 'Supplier pricing settings updated successfully',
                supplier: {
                    _id: supplier._id.toString(),
                    name: supplier.name,
                    markup: supplier.pricingSettings.markup,
                    handlesShipping: supplier.pricingSettings.handlesShipping
                }
            });
        }

        res.setHeader('Allow', ['GET', 'PATCH']);
        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error in admin suppliers API:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
