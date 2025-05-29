// src/utils/timezone.js
// Utility functions for handling Pacific Standard Time (PST) / Pacific Daylight Time (PDT)

const PST_TIMEZONE = 'America/Los_Angeles';

/**
 * Get current date/time in PST
 */
export const getCurrentPSTDate = () => {
  return new Date(new Date().toLocaleString("en-US", {timeZone: PST_TIMEZONE}));
};

/**
 * Convert any date to PST
 */
export const convertToPST = (date) => {
  if (!date) return null;
  
  let dateObj;
  
  // Handle Firestore Timestamp objects
  if (date && typeof date === 'object' && date.seconds) {
    dateObj = new Date(date.seconds * 1000);
  }
  // Handle Firestore Timestamp objects with toDate method
  else if (date && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  }
  // Handle ISO strings
  else if (typeof date === 'string') {
    dateObj = new Date(date);
  }
  // Handle regular Date objects or numbers
  else {
    dateObj = new Date(date);
  }
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  
  // Convert to PST
  return new Date(dateObj.toLocaleString("en-US", {timeZone: PST_TIMEZONE}));
};

/**
 * Format date for display in PST
 */
export const formatDatePST = (date, options = {}) => {
  if (!date) return 'Invalid Date';
  
  let dateObj;
  
  // Handle Firestore Timestamp objects
  if (date && typeof date === 'object' && date.seconds) {
    dateObj = new Date(date.seconds * 1000);
  }
  // Handle Firestore Timestamp objects with toDate method
  else if (date && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  }
  // Handle ISO strings
  else if (typeof date === 'string') {
    dateObj = new Date(date);
  }
  // Handle regular Date objects or numbers
  else {
    dateObj = new Date(date);
  }
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const defaultOptions = {
    timeZone: PST_TIMEZONE,
    ...options
  };
  
  return dateObj.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format date and time for display in PST
 */
export const formatDateTimePST = (date, options = {}) => {
  if (!date) return 'Invalid Date';
  
  let dateObj;
  
  // Handle Firestore Timestamp objects
  if (date && typeof date === 'object' && date.seconds) {
    dateObj = new Date(date.seconds * 1000);
  }
  // Handle Firestore Timestamp objects with toDate method
  else if (date && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  }
  // Handle ISO strings
  else if (typeof date === 'string') {
    dateObj = new Date(date);
  }
  // Handle regular Date objects or numbers
  else {
    dateObj = new Date(date);
  }
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const defaultOptions = {
    timeZone: PST_TIMEZONE,
    ...options
  };
  
  return dateObj.toLocaleString('en-US', defaultOptions);
};

/**
 * Format time only for display in PST
 */
export const formatTimePST = (date, options = {}) => {
  const pstDate = convertToPST(date);
  if (!pstDate) return 'Invalid Time';
  
  const defaultOptions = {
    timeZone: PST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return pstDate.toLocaleTimeString('en-US', defaultOptions);
};

/**
 * Get today's date formatted for display in PST
 */
export const getTodayFormattedPST = (options = {}) => {
  const defaultOptions = {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    timeZone: PST_TIMEZONE,
    ...options
  };
  
  return formatDatePST(new Date(), defaultOptions);
};

/**
 * Get current date formatted with weekday for display in PST
 */
export const getCurrentDateWithWeekdayPST = (options = {}) => {
  const defaultOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric', 
    year: 'numeric',
    timeZone: PST_TIMEZONE,
    ...options
  };
  
  return formatDatePST(new Date(), defaultOptions);
};

/**
 * Get time range display string in PST
 */
export const formatTimeRangePST = (startTime, endTime) => {
  if (!startTime && !endTime) return "—";
  if (startTime && !endTime) return `${startTime} - ongoing`;
  return `${startTime} - ${endTime}`;
};

/**
 * Format date for CSV export in PST
 */
export const formatDateForExportPST = (dateValue) => {
  if (!dateValue) return '';
  
  try {
    const pstDate = convertToPST(dateValue);
    if (!pstDate) return 'Invalid Date';
    
    return pstDate.toLocaleString('en-US', {
      timeZone: PST_TIMEZONE,
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting date for export:', dateValue, error);
    return 'Invalid Date';
  }
};

/**
 * Calculate end time from start time and duration in PST
 */
export const calculateEndTimePST = (startTime, durationHours) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = getCurrentPSTDate();
  startDate.setHours(hours, minutes, 0, 0);
  
  const durationMinutes = parseFloat(durationHours) * 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  
  return endDate.toTimeString().slice(0, 5); // Format as HH:MM
};