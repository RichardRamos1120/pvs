import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

class SessionManager {
  constructor() {
    this.warningTimer = null;
    this.logoutTimer = null;
    this.lastActivity = Date.now();
    this.sessionTimeout = (parseInt(process.env.REACT_APP_SESSION_TIMEOUT_MINUTES) || 30) * 60 * 1000;
    this.warningTime = this.sessionTimeout - 5 * 60 * 1000; // 5 minutes before timeout
    this.isActive = false;
    this.warningCallback = null;
    this.logoutCallback = null;
  }

  /**
   * Initialize session management
   * @param {function} warningCallback - Function to call when warning user
   * @param {function} logoutCallback - Function to call on logout
   */
  init(warningCallback, logoutCallback) {
    this.warningCallback = warningCallback;
    this.logoutCallback = logoutCallback;
    this.isActive = true;
    
    // Set up event listeners for user activity
    this.activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click', 'mousemove'];
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity, true);
    });
    
    // Start monitoring
    this.resetTimers();
    
    // Check for stored session
    this.checkStoredSession();
    
    // Set up visibility change handler
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Set up storage event listener for cross-tab communication
    window.addEventListener('storage', this.handleStorageChange);
  }

  /**
   * Handle user activity
   */
  handleActivity = () => {
    if (!this.isActive) return;
    
    const now = Date.now();
    // Only reset if more than 1 second has passed (throttle)
    if (now - this.lastActivity > 1000) {
      this.lastActivity = now;
      this.resetTimers();
      this.updateSessionStorage();
    }
  };

  /**
   * Handle visibility change (tab switching)
   */
  handleVisibilityChange = () => {
    if (document.hidden) {
      // Tab is hidden, store the timestamp
      localStorage.setItem('sessionHidden', Date.now().toString());
    } else {
      // Tab is visible again, check if session should expire
      const hiddenTime = localStorage.getItem('sessionHidden');
      if (hiddenTime) {
        const elapsed = Date.now() - parseInt(hiddenTime);
        if (elapsed > this.sessionTimeout) {
          this.logout('Session expired due to inactivity');
        } else {
          this.resetTimers();
        }
        localStorage.removeItem('sessionHidden');
      }
    }
  };

  /**
   * Handle storage changes (cross-tab communication)
   */
  handleStorageChange = (e) => {
    if (e.key === 'sessionLogout' && e.newValue) {
      // Another tab initiated logout
      this.cleanup();
      if (this.logoutCallback) {
        this.logoutCallback('Logged out from another tab');
      }
    } else if (e.key === 'sessionActivity' && e.newValue) {
      // Another tab had activity, reset our timers
      const activity = JSON.parse(e.newValue);
      if (activity.timestamp > this.lastActivity) {
        this.lastActivity = activity.timestamp;
        this.resetTimers();
      }
    }
  };

  /**
   * Reset session timers
   */
  resetTimers() {
    clearTimeout(this.warningTimer);
    clearTimeout(this.logoutTimer);
    
    if (!this.isActive) return;
    
    // Set warning timer
    this.warningTimer = setTimeout(() => {
      if (this.warningCallback) {
        const extend = this.warningCallback();
        if (extend) {
          this.resetTimers();
        }
      }
    }, this.warningTime);
    
    // Set logout timer
    this.logoutTimer = setTimeout(() => {
      this.logout('Session expired due to inactivity');
    }, this.sessionTimeout);
  }

  /**
   * Update session storage for cross-tab communication
   */
  updateSessionStorage() {
    const sessionData = {
      timestamp: this.lastActivity,
      userId: auth.currentUser?.uid
    };
    localStorage.setItem('sessionActivity', JSON.stringify(sessionData));
  }

  /**
   * Check stored session on init
   */
  checkStoredSession() {
    const storedSession = localStorage.getItem('sessionActivity');
    if (storedSession) {
      const session = JSON.parse(storedSession);
      const elapsed = Date.now() - session.timestamp;
      
      if (elapsed > this.sessionTimeout) {
        this.logout('Previous session expired');
      } else {
        this.lastActivity = session.timestamp;
      }
    }
  }

  /**
   * Logout user
   * @param {string} reason - Reason for logout
   */
  async logout(reason = 'User initiated logout') {
    this.isActive = false;
    
    try {
      // Update user's last activity in Firestore
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          lastActivity: serverTimestamp(),
          lastLogout: serverTimestamp(),
          logoutReason: reason
        });
      }
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Notify other tabs
      localStorage.setItem('sessionLogout', JSON.stringify({
        timestamp: Date.now(),
        reason
      }));
      
      // Clear session data
      localStorage.removeItem('sessionActivity');
      localStorage.removeItem('sessionHidden');
      
      // Call logout callback
      if (this.logoutCallback) {
        this.logoutCallback(reason);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Extend session
   */
  extendSession() {
    this.lastActivity = Date.now();
    this.resetTimers();
    this.updateSessionStorage();
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    this.isActive = false;
    clearTimeout(this.warningTimer);
    clearTimeout(this.logoutTimer);
    
    // Remove event listeners
    this.activityEvents?.forEach(event => {
      document.removeEventListener(event, this.handleActivity, true);
    });
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('storage', this.handleStorageChange);
  }

  /**
   * Get remaining session time
   * @returns {number} - Remaining time in milliseconds
   */
  getRemainingTime() {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, this.sessionTimeout - elapsed);
  }

  /**
   * Check if session is about to expire
   * @returns {boolean} - True if warning should be shown
   */
  shouldShowWarning() {
    return this.getRemainingTime() <= 5 * 60 * 1000; // 5 minutes
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;