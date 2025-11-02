/**
 * Organization type terminology helpers
 * Provides dynamic labels based on organization type
 */

/**
 * Get terminology based on organization type
 * @param {string} orgType - Organization type ('school', 'sport_team', 'community_org', 'other')
 * @returns {Object} Object with terminology strings
 */
export const getTerminology = (orgType) => {
  // Default to school terminology for backward compatibility
  const defaultType = orgType || 'school';
  
  if (defaultType === 'school') {
    return {
      participant: 'étudiant',
      participants: 'étudiants',
      participantLabel: 'étudiant(e)',
      participantsLabel: 'étudiants',
      organization: 'école',
      organizationLabel: 'École'
    };
  } else {
    // For sport_team, community_org, and other
    return {
      participant: 'membre',
      participants: 'membres',
      participantLabel: 'membre',
      participantsLabel: 'membres',
      organization: 'organisation',
      organizationLabel: 'Organisation'
    };
  }
};

/**
 * Get default terminology (school)
 * @returns {Object} School terminology object
 */
export const getDefaultTerminology = () => {
  return getTerminology('school');
};

/**
 * Check if organization is a school
 * @param {string} orgType - Organization type
 * @returns {boolean}
 */
export const isSchool = (orgType) => {
  return orgType === 'school';
};

/**
 * Check if organization is a sport team
 * @param {string} orgType - Organization type
 * @returns {boolean}
 */
export const isSportTeam = (orgType) => {
  return orgType === 'sport_team';
};

/**
 * Check if organization is a community organization
 * @param {string} orgType - Organization type
 * @returns {boolean}
 */
export const isCommunityOrg = (orgType) => {
  return orgType === 'community_org';
};

/**
 * Get human-readable organization type label
 * @param {string} orgType - Organization type
 * @returns {string} French label
 */
export const getOrganizationTypeLabel = (orgType) => {
  const labels = {
    school: 'École',
    sport_team: 'Équipe sportive',
    community_org: 'Organisation communautaire',
    other: 'Autre'
  };
  return labels[orgType] || 'École';
};
