// src/utils/timezone.js
// Utility functions for handling Pacific Standard Time (PST) / Pacific Daylight Time (PDT)

import { Timestamp } from 'firebase/firestore';

const PST_TIMEZONE = 'America/Los_Angeles';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

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
  
  return pstDate.toLocaleTimeString('en-US', defaultOptions as any);
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

/**
 * Check if data is stale based on PST timestamp
 */
export const isDataStalePST = (timestamp) => {
  if (!timestamp) return true;
  
  const lastFetchTime = timestampToPST(timestamp);
  if (!lastFetchTime) return true;
  
  const now = getCurrentPSTDate();
  const timeDiff = now.getTime() - lastFetchTime.getTime();
  
  return timeDiff > CACHE_DURATION;
};

/**
 * Create a PST timestamp for Firebase
 */
export const createPSTTimestamp = () => {
  // Create a Firebase Timestamp from the current time
  return Timestamp.now();
};

/**
 * Convert Firebase Timestamp to PST Date
 */
export const timestampToPST = (timestamp) => {
  if (!timestamp) return null;
  
  // Handle Firebase Timestamp
  if (timestamp && typeof timestamp.toDate === 'function') {
    return convertToPST(timestamp.toDate());
  }
  
  // Handle regular timestamps
  return convertToPST(timestamp);
};

/**
 * Format relative time in PST (e.g., "2 hours ago")
 */
export const formatRelativeTimePST = (timestamp) => {
  const date = timestampToPST(timestamp);
  if (!date) return 'Never';
  
  const now = getCurrentPSTDate();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

/**
 * Format PST time (alias for formatTimePST)
 */
export const formatPSTTime = (date) => {
  return formatTimePST(date);
};