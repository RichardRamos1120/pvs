import DOMPurify from 'dompurify';

// Input validation and sanitization utilities

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Untrusted HTML string
 * @returns {string} - Sanitized HTML string
 */
export const sanitizeHTML = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize user input for text fields
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Trim whitespace
  return sanitized.trim();
};

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with strength score and messages
 */
export const validatePassword = (password) => {
  const minLength = parseInt(process.env.REACT_APP_PASSWORD_MIN_LENGTH) || 8;
  const result = {
    isValid: true,
    score: 0,
    messages: []
  };
  
  // Check minimum length
  if (password.length < minLength) {
    result.isValid = false;
    result.messages.push(`Password must be at least ${minLength} characters long`);
  } else {
    result.score += 1;
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    result.messages.push('Password should contain at least one uppercase letter');
  } else {
    result.score += 1;
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    result.messages.push('Password should contain at least one lowercase letter');
  } else {
    result.score += 1;
  }
  
  // Check for number
  if (!/\d/.test(password)) {
    result.messages.push('Password should contain at least one number');
  } else {
    result.score += 1;
  }
  
  // Check for special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    result.messages.push('Password should contain at least one special character');
  } else {
    result.score += 1;
  }
  
  // Check for common patterns
  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123', 'admin'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    result.isValid = false;
    result.messages.push('Password contains common patterns');
    result.score = Math.max(0, result.score - 2);
  }
  
  // Set strength level
  if (result.score <= 2) {
    (result as any).strength = 'weak';
  } else if (result.score <= 3) {
    (result as any).strength = 'medium';
  } else {
    (result as any).strength = 'strong';
  }
  
  // Password is valid if it meets minimum requirements
  if (password.length >= minLength && /[A-Z]/.test(password) && 
      /[a-z]/.test(password) && /\d/.test(password)) {
    result.isValid = true;
  }
  
  return result;
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export const isValidPhone = (phone) => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone number (10 digits)
  return cleaned.length === 10;
};

/**
 * Sanitize file name
 * @param {string} fileName - Original file name
 * @returns {string} - Sanitized file name
 */
export const sanitizeFileName = (fileName) => {
  // Remove any path components
  fileName = fileName.split(/[/\\]/).pop();
  
  // Replace unsafe characters with underscores
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
};

/**
 * Check if file type is allowed
 * @param {string} fileName - File name to check
 * @param {array} allowedTypes - Array of allowed file extensions
 * @returns {boolean} - True if file type is allowed
 */
export const isAllowedFileType = (fileName, allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png']) => {
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return allowedTypes.includes(extension);
};

/**
 * Rate limiting helper
 * @param {string} key - Unique key for the action
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} - Rate limit status
 */
export const checkRateLimit = (key, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const storageKey = `rateLimit_${key}`;
  
  // Get existing attempts
  const stored = localStorage.getItem(storageKey);
  let attempts = stored ? JSON.parse(stored) : [];
  
  // Remove old attempts outside the window
  attempts = attempts.filter(timestamp => now - timestamp < windowMs);
  
  // Check if limit exceeded
  if (attempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + windowMs;
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(resetTime),
      retryAfter: Math.ceil((resetTime - now) / 1000)
    };
  }
  
  // Add current attempt
  attempts.push(now);
  localStorage.setItem(storageKey, JSON.stringify(attempts));
  
  return {
    allowed: true,
    remaining: maxAttempts - attempts.length,
    resetTime: null,
    retryAfter: 0
  };
};

/**
 * Generate secure random string
 * @param {number} length - Length of the string to generate
 * @returns {string} - Random string
 */
export const generateSecureRandom = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash sensitive data (client-side, for logging purposes only)
 * @param {string} data - Data to hash
 * @returns {Promise<string>} - Hashed data
 */
export const hashData = async (data) => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export const isValidUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Escape SQL special characters (for display purposes only - always use parameterized queries)
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export const escapeSQLString = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%": return "\\" + char;
      default: return char;
    }
  });
};

/**
 * Validate and sanitize JSON input
 * @param {string} jsonString - JSON string to validate
 * @returns {object} - Parsed JSON or null if invalid
 */
export const safeJSONParse = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Invalid JSON:', e);
    return null;
  }
};

/**
 * Create content security policy nonce
 * @returns {string} - CSP nonce
 */
export const createCSPNonce = () => {
  return generateSecureRandom(16);
};