import { auth } from '../firebase';
import { 
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier
} from 'firebase/auth';

/**
 * Enable 2FA for the current user
 * @param {string} phoneNumber - Phone number for 2FA
 * @returns {Promise<object>} - Verification ID and resolver
 */
export const enable2FA = async (phoneNumber) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    // Set up recaptcha
    const recaptchaVerifier = new (RecaptchaVerifier as any)('recaptcha-container', {
      size: 'invisible',
      callback: (response) => {
        console.log('reCAPTCHA solved');
      }
    }, auth);

    const multiFactorSession = await multiFactor(user).getSession();
    
    // Send SMS verification code
    const phoneInfoOptions = {
      phoneNumber,
      session: multiFactorSession
    };
    
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      phoneInfoOptions,
      recaptchaVerifier
    );

    return {
      verificationId,
      phoneNumber
    };
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    throw error;
  }
};

/**
 * Complete 2FA enrollment
 * @param {string} verificationId - Verification ID from enable2FA
 * @param {string} verificationCode - SMS code
 * @returns {Promise<void>}
 */
export const complete2FAEnrollment = async (verificationId, verificationCode) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);
    
    // Enroll the phone number
    await multiFactor(user).enroll(multiFactorAssertion, 'Phone Number');
  } catch (error) {
    console.error('Error completing 2FA enrollment:', error);
    throw error;
  }
};

/**
 * Disable 2FA for the current user
 * @returns {Promise<void>}
 */
export const disable2FA = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const enrolledFactors = multiFactor(user).enrolledFactors;
    
    // Unenroll all factors
    for (const factor of enrolledFactors) {
      await multiFactor(user).unenroll(factor);
    }
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    throw error;
  }
};

/**
 * Check if user has 2FA enabled
 * @returns {boolean}
 */
export const has2FAEnabled = () => {
  const user = auth.currentUser;
  if (!user) return false;
  
  return multiFactor(user).enrolledFactors.length > 0;
};

/**
 * Send verification code for 2FA login
 * @param {object} resolver - Multi-factor resolver from sign-in error
 * @param {number} factorIndex - Index of the factor to use (default 0)
 * @returns {Promise<string>} - Verification ID
 */
export const send2FAVerificationCode = async (resolver, factorIndex = 0) => {
  try {
    const recaptchaVerifier = new (RecaptchaVerifier as any)('recaptcha-container', {
      size: 'invisible'
    }, auth);

    const phoneInfoOptions = {
      multiFactorHint: resolver.hints[factorIndex],
      session: resolver.session
    };
    
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      phoneInfoOptions,
      recaptchaVerifier
    );

    return verificationId;
  } catch (error) {
    console.error('Error sending 2FA code:', error);
    throw error;
  }
};

/**
 * Complete 2FA sign-in
 * @param {object} resolver - Multi-factor resolver
 * @param {string} verificationId - Verification ID
 * @param {string} verificationCode - SMS code
 * @returns {Promise<object>} - User credential
 */
export const complete2FASignIn = async (resolver, verificationId, verificationCode) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);
    
    // Complete sign-in
    const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
    return userCredential;
  } catch (error) {
    console.error('Error completing 2FA sign-in:', error);
    throw error;
  }
};

/**
 * Set up app check for additional security
 */
export const setupAppCheck = async () => {
  // App Check would be implemented here if needed
  // This helps protect against abuse and ensures only legitimate app instances can access backend
};

/**
 * Verify ID token on critical operations
 * @returns {Promise<string>} - Fresh ID token
 */
export const getFreshIdToken = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    
    // Force token refresh
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Error getting fresh ID token:', error);
    throw error;
  }
};

/**
 * Re-authenticate user for sensitive operations
 * @param {string} password - User's current password
 * @returns {Promise<void>}
 */
export const reauthenticateUser = async (password) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user');
    
    const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
    const credential = EmailAuthProvider.credential(user.email, password);
    
    await reauthenticateWithCredential(user, credential);
  } catch (error) {
    console.error('Error re-authenticating user:', error);
    throw error;
  }
};