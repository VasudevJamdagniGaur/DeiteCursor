/**
 * Generate date ID in India timezone (Asia/Kolkata)
 * Returns format: "2025-08-29"
 */
export const getDateId = (date = new Date()) => {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

/**
 * Get current date in India timezone as Date object
 */
export const getIndiaDate = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5; // IST is UTC+5:30
  return new Date(utc + (istOffset * 3600000));
};

/**
 * Format date for display
 */
export const formatDateForDisplay = (dateId) => {
  const date = new Date(dateId);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

/**
 * Check if a date is today (in India timezone)
 */
export const isToday = (dateId) => {
  return dateId === getDateId();
};

/**
 * Get date ID for a specific number of days ago
 */
export const getDateIdDaysAgo = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getDateId(date);
};
