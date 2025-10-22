import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import User from '../../../../models/User';
import Product from '../../../../models/Product';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  try {
    await dbConnect();

    // Extract the token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ message: 'ID de campagne requis' });
    }

    // Find the school that owns this campaign
    const school = await School.findOne({
      'campaigns._id': campaignId
    });

    if (!school) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if user is school manager for this school
    const user = await User.findById(token.sub);
    if (!user || user.role !== 'school_manager') {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Verify user belongs to this school
    if (user.schoolManagerInfo?.organisme?.toString() !== school._id.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
    }

    // Find the campaign
    const campaign = school.campaigns.id(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    if (req.method === 'GET') {
      // Get all products with custom prices for this campaign
      const products = await Product.find({}).lean();
      
      const productsWithCustomPrices = products.map(product => {
        const customPrice = campaign.customPrices?.find(cp => 
          cp.productId.toString() === product._id.toString()
        );
        
        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          defaultPrice: product.price,
          customPrice: customPrice?.price || product.price,
          hasCustomPrice: !!customPrice,
          image: product.image
        };
      });

      res.status(200).json({
        products: productsWithCustomPrices,
        campaign: {
          _id: campaign._id,
          campaignNumber: campaign.campaignNumber,
          status: campaign.status,
          datesLocked: campaign.datesLocked,
          profitSplitLocked: campaign.profitSplitLocked
        }
      });

    } else if (req.method === 'PUT') {
      // Update custom prices for products
      const { products } = req.body;

      if (!Array.isArray(products)) {
        return res.status(400).json({ message: 'Format de produits invalide' });
      }

      // Update custom prices
      campaign.customPrices = products
        .filter(p => p.hasCustomPrice && p.customPrice !== p.defaultPrice)
        .map(p => ({
          productId: p._id,
          price: parseFloat(p.customPrice)
        }));

      await school.save();

      res.status(200).json({ 
        message: 'Prix personnalisés mis à jour avec succès',
        updatedCount: campaign.customPrices.length
      });

    } else {
      res.status(405).json({ message: 'Méthode non autorisée' });
    }

  } catch (error) {
    console.error('Error handling campaign products:', error);
    res.status(500).json({ message: 'Erreur lors de la gestion des produits', error: error.message });
  }
}
