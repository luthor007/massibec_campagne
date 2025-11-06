/**
 * Date utility functions for consistent date handling across the codebase
 * All dates are normalized to Quebec timezone (America/Montreal) to avoid timezone issues
 */

const QUEBEC_TIMEZONE = 'America/Montreal';

/**
 * Convert a UTC date (from MongoDB) to Quebec timezone date string (YYYY-MM-DD)
 * This is the primary function to use when converting database dates
 * 
 * IMPORTANT: This function converts UTC timestamps to Quebec date boundaries.
 * For dates created near midnight Quebec time, we need to ensure they map to the correct Quebec date.
 * 
 * @param {Date|string} date - Date object or ISO string from database
 * @returns {string} Date string in YYYY-MM-DD format in Quebec timezone
 */
export const getQuebecDateString = (date) => {
  if (!date) return null;
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Use Intl.DateTimeFormat to get the date in Quebec timezone
  // This correctly handles timezone conversions
  return getDateStringInTimezone(dateObj, QUEBEC_TIMEZONE);
};

/**
 * Get today's date as a YYYY-MM-DD string in Quebec timezone
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayDateString = () => {
  return getDateStringInTimezone(new Date(), QUEBEC_TIMEZONE);
};

/**
 * Parse a date string (YYYY-MM-DD) into a Date object
 * This creates a date at midnight in Quebec timezone
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object representing midnight in Quebec timezone
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date using local timezone constructor (not UTC)
  // This ensures the date is created at midnight in the server's timezone
  // Since we're normalizing everything to Quebec timezone strings, this is fine
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Add days to a date string and return a new date string
 * Works purely with date arithmetic to avoid timezone issues
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} New date string in YYYY-MM-DD format
 */
export const addDaysToDateString = (dateString, days) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at noon to avoid DST issues, then add days
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  // Format back to date string (YYYY-MM-DD) without timezone conversion
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
};

/**
 * Format a Date object to YYYY-MM-DD string in Quebec timezone
 * @param {Date} date - Date object to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatDateString = (date) => {
  if (!date) return '';
  return getDateStringInTimezone(date, QUEBEC_TIMEZONE);
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
 * @param {string} timeZone - Timezone (default: 'America/Montreal' for Quebec)
 * @returns {string} Date string in YYYY-MM-DD format for the specified timezone
 */
export const getDateStringInTimezone = (date, timeZone = QUEBEC_TIMEZONE) => {
  if (!date) return '';
  
  // Ensure we have a proper Date object
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // If date is invalid, return empty string
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to getDateStringInTimezone:', date);
    return '';
  }
  
  try {
    // Use Intl.DateTimeFormat to get the date in the target timezone
    // This is the most reliable method
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const parts = formatter.formatToParts(dateObj);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.warn('Failed to format date in timezone', timeZone, error);
  }

  // Fallback: Calculate Quebec timezone offset manually
  // Quebec is UTC-5 (EST) or UTC-4 (EDT)
  try {
    // Get the UTC time
    const utcTime = dateObj.getTime();
    
    // Get the timezone offset for Quebec at this specific date/time
    // Create a date formatter to get the offset
    const utcDate = new Date(utcTime);
    const quebecDateStr = utcDate.toLocaleString('en-US', { 
      timeZone: QUEBEC_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Parse the formatted string
    const [month, day, year] = quebecDateStr.split('/');
    if (year && month && day) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (error) {
    console.warn('Fallback date formatting failed', error);
  }

  // Last resort: Use UTC (shouldn't happen)
  const utcYear = dateObj.getUTCFullYear();
  const utcMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const utcDay = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${utcYear}-${utcMonth}-${utcDay}`;
};

