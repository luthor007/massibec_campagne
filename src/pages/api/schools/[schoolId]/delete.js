import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import Campaign from '../../../../models/Campaign';
import User from '../../../../models/User';
import Order from '../../../../models/Order';
import Store from '../../../../models/Store';
import SchoolManager from '../../../../models/SchoolManager';
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

    // Check if user is supplier
    const user = await User.findById(token.sub).lean();
    if (!user || user.role !== 'fournisseur') {
      return res.status(403).json({ message: 'Accès refusé. Seuls les fournisseurs peuvent supprimer des écoles.' });
    }

    const { schoolId } = req.query;

    if (!schoolId) {
      return res.status(400).json({ message: 'ID de l\'école requis' });
    }

    // Find the school
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    // Check if school has active campaigns
    const activeCampaigns = await Campaign.find({ 
      school: schoolId, 
      status: { $in: ['active', 'approved'] } 
    }).lean();

    if (activeCampaigns.length > 0) {
      return res.status(400).json({ 
        message: `Impossible de supprimer l'école. Elle a ${activeCampaigns.length} campagne(s) active(s) ou approuvée(s). Veuillez d'abord supprimer ou compléter ces campagnes.` 
      });
    }

    // Delete related data
    
    // 1. Get campaign IDs from this school BEFORE deleting them (needed for student cleanup)
    const campaignsFromThisSchool = await Campaign.find({ school: schoolId }).select('_id').lean();
    const campaignIdsFromThisSchool = campaignsFromThisSchool.map(c => c._id.toString());
    
    // 2. Identify school managers (owners, admins, members) - these will be DELETED
    const schoolManagerEntries = await SchoolManager.find({ school: schoolId }).lean();
    const managerUserIds = schoolManagerEntries.map(sm => sm.user);
    
    // Also find managers via schoolManagerInfo.organisme (for users not in SchoolManager table)
    const managersByOrganisme = await User.find({ 
      'schoolManagerInfo.organisme': schoolId,
      role: 'school_manager'
    }).select('_id').lean();
    const managerIdsByOrganisme = managersByOrganisme.map(u => u._id);
    
    // Combine all manager IDs (remove duplicates)
    const allManagerIds = [...new Set([...managerUserIds.map(id => id.toString()), ...managerIdsByOrganisme.map(id => id.toString())])];
    
    console.log(`Found ${allManagerIds.length} school managers to delete for school ${schoolId}`);
    console.log(`Found ${campaignIdsFromThisSchool.length} campaigns from this school`);
    
    // 3. Delete all campaigns for this school
    await Campaign.deleteMany({ school: schoolId });
    console.log('Deleted all campaigns for this school');

    // 4. Delete all orders for this school
    await Order.deleteMany({ school: schoolId });
    console.log('Deleted all orders for this school');

    // 5. Delete all orders where managers are the owners (orders they created as sellers)
    if (allManagerIds.length > 0) {
      await Order.deleteMany({ user: { $in: allManagerIds } });
      console.log('Deleted all orders created by school managers');
    }

    // 6. Delete all stores for managers
    if (allManagerIds.length > 0) {
      await Store.deleteMany({ user: { $in: allManagerIds } });
      console.log('Deleted all stores for school managers');
    }

    // 7. Delete all SchoolManager entries
    await SchoolManager.deleteMany({ school: schoolId });
    console.log('Deleted all SchoolManager entries');

    // 8. Delete manager user accounts completely
    if (allManagerIds.length > 0) {
      await User.deleteMany({ 
        _id: { $in: allManagerIds },
        role: 'school_manager'
      });
      console.log(`Deleted ${allManagerIds.length} school manager user accounts`);
    }

    // 9. Remove school references from students (but keep their accounts)
    // Students might have:
    // - Legacy: school field pointing to this school
    // - New: campaigns array with schoolId pointing to this school
    // We'll remove the reference but keep the student account
    
    // Remove legacy school field from students
    const studentsWithLegacySchool = await User.updateMany(
      { 
        school: schoolId,
        role: 'student'
      },
      { $unset: { school: '' } }
    );
    console.log(`Removed school reference from ${studentsWithLegacySchool.modifiedCount} students (legacy field)`);

    // Remove campaigns from students that reference this school
    // This removes the campaign entries from students' campaigns array where schoolId matches
    const studentsWithCampaigns = await User.updateMany(
      { 
        'campaigns.schoolId': schoolId,
        role: 'student'
      },
      { $pull: { campaigns: { schoolId: schoolId } } }
    );
    console.log(`Removed campaign references from students' campaigns array`);

    // Also clear activeCampaignId if it was from this school
    if (campaignIdsFromThisSchool.length > 0) {
      await User.updateMany(
        {
          activeCampaignId: { $in: campaignIdsFromThisSchool },
          role: 'student'
        },
        { $unset: { activeCampaignId: '' } }
      );
      console.log(`Cleared activeCampaignId for students that referenced ${campaignIdsFromThisSchool.length} campaigns from this school`);
    }

    // 10. Finally, delete the school
    await School.findByIdAndDelete(schoolId);
    console.log(`School ${schoolId} deleted successfully`);

    res.status(200).json({ 
      message: 'École supprimée définitivement avec succès',
      deletedSchool: {
        id: schoolId,
        name: school.name
      }
    });

  } catch (error) {
    console.error('Error deleting school:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression de l\'école', 
      error: error.message 
    });
  }
}

