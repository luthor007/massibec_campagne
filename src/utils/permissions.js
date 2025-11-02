// src/utils/permissions.js

export const PERMISSIONS = {
  owner: ['all'],
  admin: [
    'view_dashboard',
    'edit_campaigns', 
    'manage_participants',
    'manage_orders',
    'invite_managers',
    'view_reports',
    'edit_school_settings'
  ],
  member: [
    'view_dashboard',
    'manage_participants',
    'view_reports'
  ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - The user's role (owner, admin, member)
 * @param {string} permission - The permission to check
 * @returns {boolean} - Whether the role has the permission
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  
  // Owner has all permissions
  if (role === 'owner') return true;
  
  // Check if the role has the specific permission
  return PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Get all permissions for a role
 * @param {string} role - The user's role
 * @returns {string[]} - Array of permissions
 */
export function getRolePermissions(role) {
  if (!role) return [];
  return PERMISSIONS[role] || [];
}

/**
 * Check if user can invite managers
 * @param {string} role - The user's role
 * @returns {boolean} - Whether the user can invite managers
 */
export function canInviteManagers(role) {
  return hasPermission(role, 'invite_managers');
}

/**
 * Check if user can remove managers
 * @param {string} role - The user's role
 * @returns {boolean} - Whether the user can remove managers
 */
export function canRemoveManagers(role) {
  return role === 'owner';
}

/**
 * Check if user can change manager roles
 * @param {string} role - The user's role
 * @returns {boolean} - Whether the user can change roles
 */
export function canChangeRoles(role) {
  return role === 'owner';
}

/**
 * Check if user can edit school settings
 * @param {string} role - The user's role
 * @returns {boolean} - Whether the user can edit school settings
 */
export function canEditSchoolSettings(role) {
  return hasPermission(role, 'edit_school_settings');
}

