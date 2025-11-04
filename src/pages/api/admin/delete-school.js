// pages/api/admin/delete-school.js
// ⚠️ DANGEROUS OPERATION - Deletes a school and ALL associated data
// Use with extreme caution!

import connectDB from '../../../lib/mongodb';
import mongoose from 'mongoose';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import User from '../../../models/User';
import Order from '../../../models/Order';
import OrderStudent from '../../../models/OrderStudent';
import SchoolManager from '../../../models/SchoolManager';
import ManagerInvitation from '../../../models/ManagerInvitation';

export default async function handler(req, res) {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && req.query.secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (req.method !== 'POST') {
    return res.setHeader('Allow', ['POST']).status(405).end(`Méthode ${req.method} non autorisée.`);
  }

  const { schoolId, confirm } = req.body;

  if (!schoolId) {
    return res.status(400).json({ message: 'School ID requis.' });
  }

  try {
    await connectDB();

    // Convert to ObjectId if it's a string
    const schoolObjectId = typeof schoolId === 'string' 
      ? new mongoose.Types.ObjectId(schoolId)
      : schoolId;

    // Step 1: Verify school exists
    const school = await School.findById(schoolObjectId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée.' });
    }

    // Step 2: Find all associated data
    const campaigns = await Campaign.find({ school: schoolObjectId });
    const campaignIds = campaigns.map(c => c._id);

    const orderStudents = await OrderStudent.find({ school: schoolObjectId });
    
    // Find orders that reference campaigns from this school
    const orders = await Order.find({ 
      $or: [
        { campaignId: { $in: campaignIds } },
        { school: school.name } // Legacy: school is stored as string
      ]
    });

    const schoolManagers = await SchoolManager.find({ school: schoolObjectId });
    const managerUserIds = schoolManagers.map(sm => sm.user);

    const managerInvitations = await ManagerInvitation.find({ school: schoolObjectId });

    // Find users associated with this school
    // 1. Users with schoolManagerInfo.organisme = schoolId
    const managerUsers = await User.find({
      role: 'school_manager',
      'schoolManagerInfo.organisme': schoolObjectId
    });

    // 2. Users with legacy school field = schoolId
    const legacySchoolUsers = await User.find({
      school: schoolObjectId
    });

    // 3. Users with campaigns array containing this schoolId
    const campaignUsers = await User.find({
      'campaigns.schoolId': schoolObjectId
    });

    // Combine all user IDs (remove duplicates)
    const allUserIds = [
      ...new Set([
        ...managerUserIds.map(id => id.toString()),
        ...managerUsers.map(u => u._id.toString()),
        ...legacySchoolUsers.map(u => u._id.toString()),
        ...campaignUsers.map(u => u._id.toString())
      ])
    ];

    // Try to find the creator (first manager or earliest campaign creator)
    let creatorUser = null;
    if (managerUsers.length > 0) {
      // Sort by creation date if available
      creatorUser = managerUsers[0];
    } else if (campaigns.length > 0) {
      // Check if campaign has creator info
      const firstCampaign = campaigns.sort((a, b) => a.createdAt - b.createdAt)[0];
      if (firstCampaign.approvedBy) {
        creatorUser = await User.findById(firstCampaign.approvedBy);
      }
    }

    // Summary of what will be deleted
    const summary = {
      school: {
        id: school._id.toString(),
        name: school.name,
        code: school.code,
        createdAt: school.createdAt
      },
      creator: creatorUser ? {
        id: creatorUser._id.toString(),
        email: creatorUser.email,
        name: creatorUser.name
      } : null,
      counts: {
        campaigns: campaigns.length,
        orderStudents: orderStudents.length,
        orders: orders.length,
        schoolManagers: schoolManagers.length,
        managerInvitations: managerInvitations.length,
        managerUsers: managerUsers.length,
        legacySchoolUsers: legacySchoolUsers.length,
        campaignUsers: campaignUsers.length,
        totalUsers: allUserIds.length
      },
      campaigns: campaigns.map(c => ({
        id: c._id.toString(),
        code: c.campaignCode,
        number: c.campaignNumber,
        status: c.status
      })),
      users: allUserIds.map(id => {
        const user = [...managerUsers, ...legacySchoolUsers, ...campaignUsers]
          .find(u => u._id.toString() === id);
        return user ? {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role
        } : null;
      }).filter(Boolean)
    };

    // If not confirmed, return summary only
    if (!confirm) {
      return res.status(200).json({
        message: 'Vérification terminée. Examinez les données ci-dessous. Envoyez confirm: true pour procéder à la suppression.',
        summary,
        warning: '⚠️ Cette action est irréversible et supprimera toutes les données listées ci-dessus.'
      });
    }

    // Step 3: Delete in correct order
    console.log(`🗑️ Starting deletion of school ${schoolId}...`);

    // 3.1 Delete OrderStudent
    if (orderStudents.length > 0) {
      const orderStudentResult = await OrderStudent.deleteMany({ school: schoolObjectId });
      console.log(`✅ Deleted ${orderStudentResult.deletedCount} OrderStudent records`);
    }

    // 3.2 Delete Orders
    if (orders.length > 0) {
      const orderResult = await Order.deleteMany({ 
        $or: [
          { campaignId: { $in: campaignIds } },
          { school: school.name }
        ]
      });
      console.log(`✅ Deleted ${orderResult.deletedCount} Order records`);
    }

    // 3.3 Delete Campaigns
    if (campaigns.length > 0) {
      const campaignResult = await Campaign.deleteMany({ school: schoolObjectId });
      console.log(`✅ Deleted ${campaignResult.deletedCount} Campaign records`);
    }

    // 3.4 Delete ManagerInvitation
    if (managerInvitations.length > 0) {
      const invitationResult = await ManagerInvitation.deleteMany({ school: schoolObjectId });
      console.log(`✅ Deleted ${invitationResult.deletedCount} ManagerInvitation records`);
    }

    // 3.5 Delete SchoolManager
    if (schoolManagers.length > 0) {
      const schoolManagerResult = await SchoolManager.deleteMany({ school: schoolObjectId });
      console.log(`✅ Deleted ${schoolManagerResult.deletedCount} SchoolManager records`);
    }

    // 3.6 Delete Users (only if they ONLY manage this school)
    let deletedUsers = 0;
    for (const userId of allUserIds) {
      const user = await User.findById(userId);
      if (!user) continue;

      // Check if user manages other schools
      const otherSchoolManagers = await SchoolManager.find({
        user: userId,
        school: { $ne: schoolObjectId }
      });

      // Check if user has other schoolManagerInfo.organisme
      const hasOtherOrganisme = user.schoolManagerInfo?.organisme && 
        user.schoolManagerInfo.organisme.toString() !== schoolObjectId.toString();

      // Check if user has other school references
      const hasOtherLegacySchool = user.school && 
        user.school.toString() !== schoolObjectId.toString();

      // If user only manages this school, delete them
      if (otherSchoolManagers.length === 0 && !hasOtherOrganisme && !hasOtherLegacySchool) {
        // Check campaigns array
        const otherCampaigns = user.campaigns?.filter(c => 
          c.schoolId.toString() !== schoolObjectId.toString()
        ) || [];

        if (otherCampaigns.length === 0) {
          await User.findByIdAndDelete(userId);
          deletedUsers++;
          console.log(`✅ Deleted user ${user.email} (${user.name})`);
        } else {
          // Remove only this school's campaigns from user
          user.campaigns = otherCampaigns;
          if (user.activeCampaignId && campaignIds.some(id => id.toString() === user.activeCampaignId.toString())) {
            user.activeCampaignId = null;
          }
          await user.save();
          console.log(`✅ Removed school campaigns from user ${user.email}`);
        }
      } else {
        // Remove school reference from user but keep the user
        if (user.schoolManagerInfo?.organisme?.toString() === schoolObjectId.toString()) {
          // This is tricky - we need to check if they have other schools
          // For now, set to null and let them be fixed manually if needed
          user.schoolManagerInfo.organisme = null;
          await user.save();
          console.log(`⚠️ Removed school reference from user ${user.email} (they may have other schools)`);
        }
        if (user.school?.toString() === schoolObjectId.toString()) {
          user.school = null;
          await user.save();
          console.log(`✅ Removed legacy school reference from user ${user.email}`);
        }
        // Remove campaigns from this school
        if (user.campaigns) {
          user.campaigns = user.campaigns.filter(c => 
            c.schoolId.toString() !== schoolObjectId.toString()
          );
          await user.save();
        }
      }
    }

    // 3.7 Delete School
    await School.findByIdAndDelete(schoolObjectId);
    console.log(`✅ Deleted school ${school.name}`);

    console.log(`✅ Deletion complete for school ${schoolId}`);

    return res.status(200).json({
      message: 'École et toutes les données associées supprimées avec succès.',
      deleted: {
        school: 1,
        campaigns: campaigns.length,
        orderStudents: orderStudents.length,
        orders: orders.length,
        schoolManagers: schoolManagers.length,
        managerInvitations: managerInvitations.length,
        users: deletedUsers
      },
      summary
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'école:', error);
    return res.status(500).json({ 
      message: 'Erreur interne du serveur.',
      error: error.message 
    });
  }
}
