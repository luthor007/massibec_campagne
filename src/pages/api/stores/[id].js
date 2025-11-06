import dbConnect from '../../../lib/mongodb';
import Store from '../../../models/Store';
import User from '../../../models/User';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await dbConnect();

    // Special case for example store with ID "1"
    if (id === '1') {
      const exampleStore = {
        _id: '1',
        name: 'Boutique d\'exemple Massibec',
        description: '🎉 Découvrez les pâtés exclusifs de la campagne de financement Massibec (viande et poulet) ainsi qu\'un délicieux choix de tartes parfaites pour les fêtes qui approchent ! Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et, si vous ne le savez pas encore, contactez-moi pour connaître les modalités de récupération de vos produits le 18 décembre 2025. 🙏 Merci pour votre soutien et bon appétit !',
        autoDeposit: true,
        discountEnabled: true,
        user: '000000000000000000000001'
      };

      const exampleOwner = {
        _id: '000000000000000000000001',
        name: 'Élève Exemple',
        email: 'exemple@massibec.com',
        school: '671eea6a50059d84409666fa', // Chavigny school ID
        parentInfo: {
          telephone: '(819) 123-4567'
        }
      };

      return res.status(200).json({
        owner: exampleOwner,
        autoDeposit: exampleStore.autoDeposit,
        discountEnabled: exampleStore.discountEnabled,
        deliveryOptions: [
          { name: 'Travail', enabled: true },
          { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
          { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
          { name: 'Autre', enabled: true }
        ],
        name: exampleStore.name,
        description: exampleStore.description,
        ownerId: exampleStore.user,
        ownerEmail: exampleOwner.email,
        ownerName: exampleOwner.name,
        ownerPhone: exampleOwner.parentInfo?.telephone || '',
        ownerSchool: exampleOwner.school,
        campaignId: null,
        slug: null,
        campaign: null,
        schoolName: null
      });
    }

    // Try to find store by slug first, then by ID
    // Check if it's a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    let store;

    if (isObjectId) {
      // Try ID first
      store = await Store.findById(id);
    } else {
      // Try slug (each store has its own unique slug)
      store = await Store.findOne({ slug: id });

      // If still not found and it's a valid ObjectId format, try it
      if (!store && mongoose.Types.ObjectId.isValid(id)) {
        store = await Store.findById(id);
      }
    }

    if (!store) {
      return res.status(404).json({ message: 'Boutique non trouvée' });
    }

    // IMPORTANT: Get campaignId from the raw document if not available on the Mongoose document
    // This can happen if the field is not properly populated or if there's a schema issue
    const rawStore = store.toObject ? store.toObject() : store;
    const campaignIdFromRaw = rawStore.campaignId || store.campaignId;

    // Récupérer le propriétaire du magasin (l'utilisateur associé)
    const owner = await User.findById(store.user);

    if (!owner) {
      return res.status(404).json({ message: 'Propriétaire non trouvé' });
    }

    // Get campaignId and schoolId from store (campaignId is now directly on the store)
    // IMPORTANT: Use campaignIdFromRaw which comes from toObject() to ensure we get the actual value
    let campaignIdToUse = null;
    if (campaignIdFromRaw) {
      // If it's an ObjectId, convert to string
      if (mongoose.Types.ObjectId.isValid(campaignIdFromRaw)) {
        campaignIdToUse = campaignIdFromRaw.toString();
      } else {
        campaignIdToUse = campaignIdFromRaw;
      }
    }

    // Get campaign data and school info in one query
    let campaignData = null;
    let schoolName = null;
    let schoolIdToUse = null;

    if (campaignIdToUse) {
      const campaign = await Campaign.findById(campaignIdToUse).populate('school').lean();
      if (campaign) {
        // Extract campaign dates
        campaignData = {
          endDate: campaign.endDate,
          deliveryDate: campaign.deliveryDate,
          status: campaign.status,
          isActive: campaign.isActive
        };

        // Get school info from campaign
        if (campaign.school) {
          schoolIdToUse = campaign.school._id.toString();
          schoolName = campaign.school.name;
        }
      }
    }

    // Fallback to owner.school (legacy field) if campaign doesn't have school
    if (!schoolIdToUse && owner.school) {
      schoolIdToUse = owner.school.toString();
      // Fetch school name if we don't have it yet
      if (!schoolName) {
        const school = await School.findById(owner.school).lean();
        if (school) {
          schoolName = school.name;
        }
      }
    }

    // Get owner phone number
    const ownerPhone = owner.role === 'school_manager'
      ? (owner.schoolManagerInfo?.telephone || owner.schoolManagerInfo?.cellulaire || '')
      : (owner.parentInfo?.telephone || '');

    res.status(200).json({
      owner: owner,
      autoDeposit: store.autoDeposit,
      discountEnabled: store.discountEnabled,
      deliveryOptions: (() => {
        // Ensure deliveryOptions are in the new format
        if (store.deliveryOptions && Array.isArray(store.deliveryOptions) && store.deliveryOptions.length > 0) {
          // If old format (strings), migrate
          if (typeof store.deliveryOptions[0] === 'string') {
            const migrationMap = {
              'Travail': { name: 'Travail', enabled: true },
              'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
              'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
              'Autre': { name: 'Autre', enabled: true }
            };
            return store.deliveryOptions.map(opt => {
              if (typeof opt === 'string') {
                return migrationMap[opt] || { name: opt, enabled: true };
              }
              return opt;
            });
          }
          // Already in new format
          return store.deliveryOptions.map(opt => ({
            name: opt.name || 'Autre',
            enabled: opt.enabled !== undefined ? opt.enabled : true,
            pickupAddress: opt.pickupAddress || '',
            deliveryRadius: opt.deliveryRadius || ''
          }));
        }
        // Default options
        return [
          { name: 'Travail', enabled: true },
          { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
          { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
          { name: 'Autre', enabled: true }
        ];
      })(),
      name: store.name,
      description: store.description,
      ownerId: store.user,
      ownerEmail: owner.email,
      ownerName: owner.name,
      ownerPhone: ownerPhone,
      ownerSchool: schoolIdToUse, // Keep for backward compatibility
      campaignId: campaignIdToUse, // campaignId is now directly on the store
      slug: store.slug || null,
      // Include campaign data and school name directly
      campaign: campaignData,
      schoolName: schoolName
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la boutique' });
  }
}