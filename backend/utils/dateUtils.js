/**
 * Utility functions for handling date parsing and validation for reviews
 */

/**
 * Parses a date string into a JavaScript Date object
 * Handles various date formats including relative dates
 * @param {string} dateStr - The date string to parse
 * @returns {Date|null} - JavaScript Date object or null if parsing failed
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  const trimmedDate = dateStr.trim();
  
  // Handle standard date formats
  const standardDate = new Date(trimmedDate);
  if (!isNaN(standardDate.getTime())) {
    return standardDate;
  }
  
  // Handle relative dates like "2 days ago", "1 month ago", etc.
  const relativeMatch = trimmedDate.match(/(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    
    const now = new Date();
    
    // Apply the relative time
    if (unit === 'day' || unit === 'days') {
      now.setDate(now.getDate() - amount);
    } else if (unit === 'week' || unit === 'weeks') {
      now.setDate(now.getDate() - (amount * 7));
    } else if (unit === 'month' || unit === 'months') {
      now.setMonth(now.getMonth() - amount);
    } else if (unit === 'year' || unit === 'years') {
      now.setFullYear(now.getFullYear() - amount);
    }
    
    return now;
  }
  
  // Handle format like "Jan 15, 2023" or "January 15, 2023"
  const monthNameMatch = trimmedDate.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:,|\s)+(\d{4})/);
  if (monthNameMatch) {
    const monthName = monthNameMatch[1];
    const day = parseInt(monthNameMatch[2], 10);
    const year = parseInt(monthNameMatch[3], 10);
    
    const months = {
      'jan': 0, 'january': 0,
      'feb': 1, 'february': 1,
      'mar': 2, 'march': 2,
      'apr': 3, 'april': 3,
      'may': 4,
      'jun': 5, 'june': 5,
      'jul': 6, 'july': 6,
      'aug': 7, 'august': 7,
      'sep': 8, 'september': 8,
      'oct': 9, 'october': 9,
      'nov': 10, 'november': 10,
      'dec': 11, 'december': 11
    };
    
    const monthIndex = months[monthName.toLowerCase()];
    if (monthIndex !== undefined) {
      return new Date(year, monthIndex, day);
    }
  }
  
  // Handle format like "2023-01-15" or "2023/01/15"
  const numericMatch = trimmedDate.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (numericMatch) {
    const year = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1; // JS months are 0-based
    const day = parseInt(numericMatch[3], 10);
    return new Date(year, month, day);
  }
  
  // Handle format like "15/01/2023" or "15-01-2023"
  const euroDateMatch = trimmedDate.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (euroDateMatch) {
    const day = parseInt(euroDateMatch[1], 10);
    const month = parseInt(euroDateMatch[2], 10) - 1; // JS months are 0-based
    const year = parseInt(euroDateMatch[3], 10);
    return new Date(year, month, day);
  }
  
  // Handle other common formats
  // Add more formats as needed
  
  return null; // Return null if parsing failed
}

/**
 * Formats a Date object to YYYY-MM-DD string
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is within the specified range (inclusive)
 * @param {Date} date - The date to check
 * @param {Date} startDate - The start of the range
 * @param {Date} endDate - The end of the range
 * @returns {boolean} - True if date is within range
 */
function isDateInRange(date, startDate, endDate) {
  if (!date || !startDate || !endDate) return false;
  
  return date >= startDate && date <= endDate;
}

module.exports = {
  parseDate,
  formatDate,
  isDateInRange
};
