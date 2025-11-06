// src/middleware/checkManagerPermission.js
import dbConnect from '../lib/mongodb';
import SchoolManager from '../models/SchoolManager';

/**
 * Middleware to check if a user has the required permission for a school
 * @param {string} schoolId - The school ID to check permissions for
 * @param {string} requiredPermission - The permission required
 * @param {string} userId - The user ID to check
 * @returns {Promise<{hasPermission: boolean, role: string|null}>}
 */
export async function checkManagerPermission(schoolId, requiredPermission, userId) {
  try {
    await dbConnect();

    // Find the user's manager record for this school
    const schoolManager = await SchoolManager.findOne({
      school: schoolId,
      user: userId,
      status: 'active'
    });

    if (!schoolManager) {
      return { hasPermission: false, role: null };
    }

    // Import permission helper
    const { hasPermission } = await import('../utils/permissions');
    
    const userHasPermission = hasPermission(schoolManager.role, requiredPermission);
    
    return {
      hasPermission: userHasPermission,
      role: schoolManager.role
    };

  } catch (error) {
    console.error('Error checking manager permission:', error);
    return { hasPermission: false, role: null };
  }
}

/**
 * Express-style middleware for API routes
 * @param {string} requiredPermission - The permission required
 * @returns {Function} Express middleware function
 */
export function requireManagerPermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const { schoolId } = req.query;
      const userId = req.user?.id || req.user?._id;

      if (!schoolId || !userId) {
        return res.status(400).json({ message: 'School ID and User ID required' });
      }

      const { hasPermission, role } = await checkManagerPermission(schoolId, requiredPermission, userId);

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: requiredPermission,
          userRole: role
        });
      }

      // Add role to request for use in route handlers
      req.userRole = role;
      next();

    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ message: 'Error checking permissions' });
    }
  };
}

/**
 * Check if user can access school dashboard
 * @param {string} schoolId - The school ID
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>}
 */
export async function canAccessSchoolDashboard(schoolId, userId) {
  const { hasPermission } = await checkManagerPermission(schoolId, 'view_dashboard', userId);
  return hasPermission;
}

/**
 * Check if user can invite managers
 * @param {string} schoolId - The school ID
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>}
 */
export async function canInviteManagers(schoolId, userId) {
  const { hasPermission } = await checkManagerPermission(schoolId, 'invite_managers', userId);
  return hasPermission;
}

/**
 * Check if user can edit campaigns
 * @param {string} schoolId - The school ID
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>}
 */
export async function canEditCampaigns(schoolId, userId) {
  const { hasPermission } = await checkManagerPermission(schoolId, 'edit_campaigns', userId);
  return hasPermission;
}


