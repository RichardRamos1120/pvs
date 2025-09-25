import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { checkRateLimit } from './security';

/**
 * Track login attempts for a user
 * @param {string} email - User email
 * @returns {Promise<object>} - Login attempt status
 */
export const trackLoginAttempt = async (email) => {
  const maxAttempts = parseInt(process.env.REACT_APP_MAX_LOGIN_ATTEMPTS) || 5;
  const lockoutDuration = (parseInt(process.env.REACT_APP_LOCKOUT_DURATION_MINUTES) || 15) * 60 * 1000;
  
  // Check rate limit
  const rateLimit = checkRateLimit(`login_${email}`, maxAttempts, lockoutDuration);
  
  if (!rateLimit.allowed) {
    return {
      allowed: false,
      message: `Too many login attempts. Please try again in ${Math.ceil(rateLimit.retryAfter / 60)} minutes.`,
      resetTime: rateLimit.resetTime
    };
  }
  
  return {
    allowed: true,
    remaining: rateLimit.remaining
  };
};

/**
 * Log authentication event
 * @param {string} userId - User ID
 * @param {string} event - Event type
 * @param {object} metadata - Additional metadata
 */
export const logAuthEvent = async (userId, event, metadata = {}) => {
  try {
    const eventData = {
      userId,
      event,
      timestamp: serverTimestamp(),
      ip: (metadata as any).ip || 'unknown',
      userAgent: navigator.userAgent,
      ...metadata
    };
    
    // Store in a separate auth_logs collection
    const logRef = doc(db, 'auth_logs', `${userId}_${Date.now()}`);
    await setDoc(logRef, eventData);
  } catch (error) {
    console.error('Error logging auth event:', error);
  }
};

/**
 * Update user security profile
 * @param {string} userId - User ID
 * @param {object} updates - Security updates
 */
export const updateSecurityProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    const securityUpdates = {
      ...updates,
      lastSecurityUpdate: serverTimestamp()
    };
    
    await updateDoc(userRef, {
      security: securityUpdates
    });
  } catch (error) {
    console.error('Error updating security profile:', error);
  }
};

/**
 * Check if user account is locked
 * @param {string} email - User email
 * @returns {Promise<boolean>} - True if account is locked
 */
export const isAccountLocked = async (email) => {
  const rateLimit = checkRateLimit(`login_${email}`, 0, 0);
  return !rateLimit.allowed;
};

/**
 * Reset login attempts for a user
 * @param {string} email - User email
 */
export const resetLoginAttempts = (email) => {
  localStorage.removeItem(`rateLimit_login_${email}`);
};

/**
 * Validate session token
 * @returns {Promise<boolean>} - True if session is valid
 */
export const validateSession = async () => {
  try {
    if (!auth.currentUser) return false;
    
    // Get fresh ID token
    const token = await auth.currentUser.getIdToken(true);
    
    // Verify token claims
    const idTokenResult = await auth.currentUser.getIdTokenResult();
    
    // Check if token is not expired
    const expirationTime = new Date(idTokenResult.expirationTime).getTime();
    const now = Date.now();
    
    if (now >= expirationTime) {
      return false;
    }
    
    // Additional custom validation can be added here
    
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};

/**
 * Get user's security settings
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Security settings
 */
export const getUserSecuritySettings = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data().security || {};
    }
    
    return {};
  } catch (error) {
    console.error('Error getting security settings:', error);
    return {};
  }
};

/**
 * Check password history to prevent reuse
 * @param {string} userId - User ID
 * @param {string} passwordHash - Hashed password to check
 * @returns {Promise<boolean>} - True if password was used before
 */
export const checkPasswordHistory = async (userId, passwordHash) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const passwordHistory = userDoc.data().passwordHistory || [];
      return passwordHistory.includes(passwordHash);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking password history:', error);
    return false;
  }
};

/**
 * Add password to history
 * @param {string} userId - User ID
 * @param {string} passwordHash - Hashed password to add
 */
export const addToPasswordHistory = async (userId, passwordHash) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      let passwordHistory = userDoc.data().passwordHistory || [];
      
      // Keep only last 5 passwords
      passwordHistory = [passwordHash, ...passwordHistory.slice(0, 4)];
      
      await updateDoc(userRef, {
        passwordHistory,
        lastPasswordChange: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating password history:', error);
  }
};

/**
 * Check if password change is required
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if password change is required
 */
export const isPasswordChangeRequired = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Check if password change is forced
      if (userData.forcePasswordChange) {
        return true;
      }
      
      // Check password age (90 days)
      if (userData.lastPasswordChange) {
        const lastChange = userData.lastPasswordChange.toDate();
        const daysSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceChange > 90) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking password change requirement:', error);
    return false;
  }
};

/**
 * Generate secure session token
 * @returns {string} - Session token
 */
export const generateSessionToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Verify user's device
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if device is trusted
 */
export const verifyDevice = async (userId) => {
  try {
    const deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
      // Generate new device ID
      const newDeviceId = generateSessionToken();
      localStorage.setItem('deviceId', newDeviceId);
      
      // Register device
      await registerDevice(userId, newDeviceId);
      
      return false; // New device, might need additional verification
    }
    
    // Check if device is trusted
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const trustedDevices = userDoc.data().trustedDevices || [];
      return trustedDevices.includes(deviceId);
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying device:', error);
    return false;
  }
};

/**
 * Register a new device for user
 * @param {string} userId - User ID
 * @param {string} deviceId - Device ID
 */
export const registerDevice = async (userId, deviceId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const deviceInfo = {
      id: deviceId,
      userAgent: navigator.userAgent,
      registeredAt: serverTimestamp(),
      lastUsed: serverTimestamp()
    };
    
    await updateDoc(userRef, {
      devices: {
        [deviceId]: deviceInfo
      }
    });
  } catch (error) {
    console.error('Error registering device:', error);
  }
};