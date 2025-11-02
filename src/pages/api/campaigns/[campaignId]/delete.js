import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';
import School from '../../../../models/School';
import User from '../../../../models/User';
import Order from '../../../../models/Order';
import OrderStudent from '../../../../models/OrderStudent';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

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

    // Find the campaign
    const campaign = await Campaign.findById(campaignId).populate('school');
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if user is school manager
    const user = await User.findById(token.sub);
    if (!user || user.role !== 'school_manager') {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Verify user belongs to this school
    const schoolId = campaign.school?._id?.toString() || campaign.school?.toString() || campaign.school;
    const userSchoolId = user.schoolManagerInfo?.organisme?.toString();
    
    if (schoolId !== userSchoolId) {
      return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
    }

    // Only allow deletion if campaign is not approved or active
    if (campaign.status === 'approved' || campaign.status === 'active') {
      return res.status(400).json({ 
        message: 'Cette campagne a été approuvée ou est active et ne peut pas être supprimée. Contactez Massibec pour plus d\'informations.' 
      });
    }

    // Check if there are any orders associated with this campaign
    const ordersCount = await Order.countDocuments({ campaignId: campaign._id });
    const studentOrdersCount = await OrderStudent.countDocuments({ 
      school: schoolId,
      campaignNumber: campaign.campaignNumber 
    });

    if (ordersCount > 0 || studentOrdersCount > 0) {
      return res.status(400).json({ 
        message: `Cette campagne ne peut pas être supprimée car elle contient ${ordersCount + studentOrdersCount} commande(s). Veuillez d'abord supprimer toutes les commandes associées.` 
      });
    }

    // Delete the campaign
    await Campaign.findByIdAndDelete(campaignId);

    // Update school's activeCampaignId if it was pointing to this campaign
    const school = await School.findById(schoolId);
    if (school && school.activeCampaignId?.toString() === campaignId) {
      // Find the next active campaign or set to null
      const nextActiveCampaign = await Campaign.findOne({
        school: schoolId,
        isActive: true,
        status: { $ne: 'rejected' }
      }).sort({ campaignNumber: -1 });

      school.activeCampaignId = nextActiveCampaign?._id || null;
      await school.save();
    }

    // Remove campaign from users' campaigns arrays
    await User.updateMany(
      { 
        'campaigns.campaignId': campaign._id 
      },
      {
        $pull: { 
          campaigns: { campaignId: campaign._id } 
        }
      }
    );

    // Clear activeCampaignId if it was this campaign
    await User.updateMany(
      { activeCampaignId: campaign._id },
      { $set: { activeCampaignId: null } }
    );

    res.status(200).json({ 
      message: 'Campagne supprimée avec succès'
    });

  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la campagne', error: error.message });
  }
}
