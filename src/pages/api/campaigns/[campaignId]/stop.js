import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';
import School from '../../../../models/School';
import User from '../../../../models/User';
import SchoolManager from '../../../../models/SchoolManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    // Check direct ownership or SchoolManager relationship
    let hasAccess = schoolId === userSchoolId;

    if (!hasAccess) {
      // Check SchoolManager relationship
      const schoolManagerRecord = await SchoolManager.findOne({
        user: token.sub,
        school: schoolId,
        status: 'active'
      });
      hasAccess = !!schoolManagerRecord;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Accès non autorisé à cette campagne' });
    }

    // Update campaign status to stopped
    campaign.status = 'stopped';
    campaign.isActive = false;
    await campaign.save();

    // Update school's activeCampaignId if it was pointing to this campaign
    const school = await School.findById(schoolId);
    if (school && school.activeCampaignId?.toString() === campaignId) {
      // Find the next active campaign or set to null
      const nextActiveCampaign = await Campaign.findOne({
        school: schoolId,
        isActive: true,
        status: { $nin: ['rejected', 'stopped'] }
      }).sort({ campaignNumber: -1 });

      school.activeCampaignId = nextActiveCampaign?._id || null;
      await school.save();
    }

    // Clear activeCampaignId from users if it was this campaign
    await User.updateMany(
      { activeCampaignId: campaign._id },
      { $set: { activeCampaignId: null } }
    );

    res.status(200).json({
      message: 'Campagne arrêtée avec succès',
      campaign: campaign.toObject()
    });

  } catch (error) {
    console.error('Error stopping campaign:', error);
    res.status(500).json({ message: 'Erreur lors de l\'arrêt de la campagne', error: error.message });
  }
}
