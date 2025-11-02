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

    // Try to find existing store
    let store = await Store.findOne({ user: userId });

    if (store) {
      return res.status(200).json({ 
        storeId: store._id.toString(),
        created: false
      });
    }

    // Get school info for store name
    let schoolName = 'Notre organisation';
    let activeCampaignId = null;

    // Try to get school from SchoolManager first
    const SchoolManager = (await import('../../../models/SchoolManager')).default;
    const schoolManager = await SchoolManager.findOne({
      user: userId,
      status: 'active'
    }).populate('school', 'name');

    if (schoolManager?.school) {
      schoolName = schoolManager.school.name;
      const school = schoolManager.school;

      // Try to find active campaign for this school
      const activeCampaign = await Campaign.findOne({
        school: school._id,
        isActive: true
      }).sort({ campaignNumber: -1 });

      if (activeCampaign) {
        activeCampaignId = activeCampaign._id;
      }
    } else if (user.schoolManagerInfo?.organisme) {
      // Fallback to legacy schoolManagerInfo
      const school = await School.findById(user.schoolManagerInfo.organisme);
      if (school) {
        schoolName = school.name;

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

    // Create new store
    const newStore = new Store({
      user: userId,
      name: `Boutique de ${schoolName}`,
      description: "🎉 Profitez des pâtés exclusifs de Massibec (viande et poulet) ainsi que d'un choix de délicieuses tartes pour les fêtes ! Économisez plus en achetant plus : 5 % de rabais dès 6 produits. Chaque achat soutient directement nos activités ! 📚 Commandez dès maintenant et récupérez facilement vos produits. 🙏 Merci pour votre générosité !",
      autoDeposit: false,
      hoursAvailable: "18h-20h",
      discountEnabled: true
    });

    await newStore.save();

    // Update user's store reference if not set
    if (!user.store) {
      user.store = newStore._id;
      await user.save();
    }

    return res.status(201).json({ 
      storeId: newStore._id.toString(),
      created: true
    });

  } catch (error) {
    console.error('Error creating/getting store:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la boutique', error: error.message });
  }
}

