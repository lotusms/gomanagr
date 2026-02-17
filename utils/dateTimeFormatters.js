/**
 * Date and Time Formatting Utilities
 * Formats dates and times according to user preferences
 */

/**
 * Format a date string (YYYY-MM-DD) according to user's date format preference
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} dateFormat - Format preference: 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'
 * @param {string} timezone - User's timezone (e.g., 'America/New_York')
 * @returns {string} Formatted date string
 */
export function formatDate(dateString, dateFormat = 'MM/DD/YYYY', timezone = 'UTC') {
  if (!dateString) return '';
  
  // Parse the date string as local date (YYYY-MM-DD)
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const day = parseInt(parts[2], 10);
  
  // Create date in user's timezone
  const date = new Date(year, month, day);
  
  // Format according to preference
  switch (dateFormat) {
    case 'MM/DD/YYYY':
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        timeZone: timezone,
      });
    case 'DD/MM/YYYY':
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: timezone,
      });
    case 'YYYY-MM-DD':
      return date.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: timezone,
      });
    case 'DD MMM YYYY':
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: timezone,
      });
    default:
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone,
      });
  }
}

/**
 * Format a time string (HH:MM in 24h format) according to user's time format preference
 * @param {string} timeString - Time in HH:MM format (24h)
 * @param {string} timeFormat - Format preference: '12h' or '24h'
 * @returns {string} Formatted time string
 */
export function formatTime(timeString, timeFormat = '24h') {
  if (!timeString) return '';
  
  // Parse time string (HH:MM)
  const [hours, minutes] = timeString.split(':').map(Number);
  
  if (timeFormat === '12h') {
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  }
  
  // Return 24-hour format
  return timeString;
}

/**
 * Parse a formatted date string back to YYYY-MM-DD format
 * @param {string} formattedDate - Formatted date string
 * @param {string} dateFormat - Format preference used to format the date
 * @param {string} timezone - User's timezone
 * @returns {string} Date in YYYY-MM-DD format
 */
export function parseFormattedDate(formattedDate, dateFormat = 'MM/DD/YYYY', timezone = 'UTC') {
  if (!formattedDate) return '';
  
  try {
    let date;
    
    switch (dateFormat) {
      case 'MM/DD/YYYY':
        // Parse MM/DD/YYYY format
        const mmddyyyy = formattedDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (mmddyyyy) {
          date = new Date(parseInt(mmddyyyy[3], 10), parseInt(mmddyyyy[1], 10) - 1, parseInt(mmddyyyy[2], 10));
        }
        break;
      case 'DD/MM/YYYY':
        // Parse DD/MM/YYYY format
        const ddmmyyyy = formattedDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (ddmmyyyy) {
          date = new Date(parseInt(ddmmyyyy[3], 10), parseInt(ddmmyyyy[2], 10) - 1, parseInt(ddmmyyyy[1], 10));
        }
        break;
      case 'YYYY-MM-DD':
        // Already in correct format
        return formattedDate;
      case 'DD MMM YYYY':
        // Parse DD MMM YYYY format (e.g., "16 Feb 2026")
        date = new Date(formattedDate);
        break;
      default:
        date = new Date(formattedDate);
    }
    
    if (date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }
  
  return '';
}

/**
 * Parse a formatted time string back to HH:MM format (24h)
 * @param {string} formattedTime - Formatted time string (e.g., "10:30 AM" or "10:30")
 * @param {string} timeFormat - Format preference used to format the time
 * @returns {string} Time in HH:MM format (24h)
 */
export function parseFormattedTime(formattedTime, timeFormat = '24h') {
  if (!formattedTime) return '';
  
  if (timeFormat === '12h') {
    // Parse 12-hour format (e.g., "10:30 AM" or "6:00 PM")
    const match = formattedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }
  
  // Already in 24-hour format or parse as-is
  const match = formattedTime.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  
  return formattedTime;
}
