/**
 * Date utility functions for consistent date handling across the codebase
 * All dates are treated as local dates (YYYY-MM-DD format) to avoid timezone issues
 */

/**
 * Parse a date string (YYYY-MM-DD) into a local Date object
 * This avoids timezone issues by manually constructing the date
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object in local timezone
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0); // Create date in local timezone
};

/**
 * Get today's date as a YYYY-MM-DD string
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a Date object to YYYY-MM-DD string
 * @param {Date} date - Date object to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatDateString = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculate minimum delivery date (3 weeks after end date)
 * @param {string} endDateString - End date in YYYY-MM-DD format
 * @returns {string} Minimum delivery date in YYYY-MM-DD format
 */
export const getMinDeliveryDate = (endDateString) => {
  if (!endDateString) {
    return getTodayDateString();
  }
  const endDate = parseLocalDate(endDateString);
  const threeWeeksInMillis = 21 * 24 * 60 * 60 * 1000;
  const minDeliveryDate = new Date(endDate.getTime() + threeWeeksInMillis);
  return formatDateString(minDeliveryDate);
};

/**
 * Get date string in a specific timezone (for server-side use)
 * @param {Date} date - Date object
 * @param {string} timeZone - Timezone (default: 'America/Toronto')
 * @returns {string} Date string in YYYY-MM-DD format for the specified timezone
 */
export const getDateStringInTimezone = (date, timeZone = 'America/Toronto') => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.warn('Failed to format date in timezone', timeZone, error);
  }

  // Fallback to UTC if timezone formatting fails
  const utcYear = date.getUTCFullYear();
  const utcMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const utcDay = String(date.getUTCDate()).padStart(2, '0');
  return `${utcYear}-${utcMonth}-${utcDay}`;
};

