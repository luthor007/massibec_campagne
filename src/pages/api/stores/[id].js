import dbConnect from '../../../lib/mongodb';
import Store from '../../../models/Store';
import User from '../../../models/User';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';

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
        name: exampleStore.name, 
        description: exampleStore.description, 
        ownerId: exampleStore.user, 
        ownerEmail: exampleOwner.email, 
        ownerName: exampleOwner.name, 
        ownerSchool: exampleOwner.school 
      });
    }
    
    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({ message: 'Boutique non trouvée' });
    }

        // Récupérer le propriétaire du magasin (l'utilisateur associé)
    const owner = await User.findById(store.user);

    if (!owner) {
        return res.status(404).json({ message: 'Propriétaire non trouvé' });
    }

    console.log('Owner from store api')
    console.log(owner)

    // Campaign-based approach: Get campaignId and schoolId from owner's active campaign
    let campaignIdToUse = null;
    let schoolIdToUse = null;
    
    // For school managers: try to get from school's activeCampaignId first
    if (owner.role === 'school_manager' && owner.schoolManagerInfo?.organisme) {
      const school = await School.findById(owner.schoolManagerInfo.organisme);
      if (school && school.activeCampaignId) {
        campaignIdToUse = school.activeCampaignId.toString();
        schoolIdToUse = school._id.toString();
        console.log(`[stores API] Found campaignId from school.activeCampaignId for school_manager:`, campaignIdToUse);
      }
    }
    
    // First, try to get from activeCampaignId if it exists (for students or if school didn't have one)
    if (!campaignIdToUse && owner.activeCampaignId) {
      campaignIdToUse = owner.activeCampaignId.toString();
      const activeCampaignEntry = owner.campaigns?.find(campaign => {
        const campaignId = campaign.campaignId?.toString() || campaign.campaignId?._id?.toString();
        return campaignId === owner.activeCampaignId.toString();
      });
      if (activeCampaignEntry && activeCampaignEntry.schoolId) {
        schoolIdToUse = activeCampaignEntry.schoolId.toString();
      }
      console.log(`[stores API] Found campaignId from owner.activeCampaignId:`, campaignIdToUse);
    }
    
    // If not found, try to get from any active campaign
    if (!campaignIdToUse && owner.campaigns && owner.campaigns.length > 0) {
      const activeCampaign = owner.campaigns.find(campaign => campaign.isActive);
      if (activeCampaign) {
        campaignIdToUse = (activeCampaign.campaignId?.toString() || activeCampaign.campaignId?._id?.toString());
        if (activeCampaign.schoolId) {
          schoolIdToUse = activeCampaign.schoolId.toString();
        }
      }
    }
    
    // If still not found, try to get from the first campaign (fallback)
    if (!campaignIdToUse && owner.campaigns && owner.campaigns.length > 0) {
      const firstCampaign = owner.campaigns[0];
      if (firstCampaign) {
        campaignIdToUse = (firstCampaign.campaignId?.toString() || firstCampaign.campaignId?._id?.toString());
        if (firstCampaign.schoolId) {
          schoolIdToUse = firstCampaign.schoolId.toString();
        }
      }
    }
    
    // Fallback to owner.school (legacy field) - but still try to get campaignId
    if (!schoolIdToUse && owner.school) {
      schoolIdToUse = owner.school.toString();
    }
    
    // If still no schoolId, log error but don't fail - return what we have
    if (!schoolIdToUse) {
      console.error('No schoolId found for owner:', owner._id, 'Owner campaigns:', owner.campaigns);
    } else {
      console.log('Found schoolId for store:', schoolIdToUse);
    }
    
    if (campaignIdToUse) {
      console.log('Found campaignId for store:', campaignIdToUse);
    }

    res.status(200).json({ 
      owner: owner, 
      autoDeposit: store.autoDeposit, 
      discountEnabled: store.discountEnabled, 
      name: store.name, 
      description: store.description, 
      ownerId: store.user, 
      ownerEmail: owner.email, 
      ownerName: owner.name, 
      ownerSchool: schoolIdToUse, // Keep for backward compatibility
      campaignId: campaignIdToUse // New: campaign-based approach
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la boutique' });
  }
}