import dbConnect from '../../../lib/mongodb';
import Store from '../../../models/Store';
import User from '../../../models/User';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const userId = token.sub;

    // Check if user is a school_manager
    const user = await User.findById(userId);
    if (!user || user.role !== 'school_manager') {
      return res.status(403).json({ message: 'Accès réservé aux gestionnaires d\'école' });
    }

    // Get active campaign for this school manager
    let activeCampaignId = null;
    const SchoolManager = (await import('../../../models/SchoolManager')).default;
    const schoolManager = await SchoolManager.findOne({
      user: userId,
      status: 'active'
    }).populate('school', 'name');

    if (schoolManager?.school) {
      // Try to find active campaign for this school
      const activeCampaign = await Campaign.findOne({
        school: schoolManager.school._id,
        isActive: true
      }).sort({ campaignNumber: -1 });

      if (activeCampaign) {
        activeCampaignId = activeCampaign._id;
      }
    } else if (user.schoolManagerInfo?.organisme) {
      // Fallback to legacy schoolManagerInfo
      const school = await School.findById(user.schoolManagerInfo.organisme);
      if (school) {
        // Try to find active campaign
        const activeCampaign = await Campaign.findOne({
          school: school._id,
          isActive: true
        }).sort({ campaignNumber: -1 });

        if (activeCampaign) {
          activeCampaignId = activeCampaign._id;
        }
      }
    }

    // Try to find existing store for the active campaign
    let store = null;
    if (activeCampaignId) {
      store = await Store.findOne({ user: userId, campaignId: activeCampaignId });
    }

    if (store) {
      return res.status(200).json({
        storeId: store._id.toString(),
        created: false
      });
    }

    // Get school info for store name
    let schoolName = 'Notre organisation';

    if (schoolManager?.school) {
      schoolName = schoolManager.school.name;
    } else if (user.schoolManagerInfo?.organisme) {
      // Fallback to legacy schoolManagerInfo
      const school = await School.findById(user.schoolManagerInfo.organisme);
      if (school) {
        schoolName = school.name;
      }
    }

    // If no active campaign found, return error
    if (!activeCampaignId) {
      return res.status(400).json({
        message: 'Aucune campagne active trouvée pour cette école. Veuillez créer une campagne d\'abord.'
      });
    }

    // Create new store for this campaign
    const newStore = new Store({
      user: userId,
      campaignId: activeCampaignId,
      name: `Boutique de ${schoolName}`,
      description: "🎉 Profitez de nos produits exclusifs ainsi que d'un choix de délicieuses tartes pour les fêtes ! Économisez plus en achetant plus : 5 % de rabais dès 6 produits. Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et récupérez facilement vos produits. 🙏 Merci pour votre générosité !",
      autoDeposit: false,
      hoursAvailable: "18h-20h",
      discountEnabled: true
    });

    await newStore.save();

    return res.status(201).json({
      storeId: newStore._id.toString(),
      created: true
    });

  } catch (error) {
    console.error('Error creating/getting store:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la boutique', error: error.message });
  }
}

