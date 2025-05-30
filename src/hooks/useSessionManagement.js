import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import sessionManager from '../utils/sessionManager';
import { logAuthEvent } from '../utils/authSecurity';
import { auth } from '../firebase';

const useSessionManagement = () => {
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();

  const handleWarning = useCallback(() => {
    setShowWarning(true);
    return false; // Don't auto-extend, wait for user action
  }, []);

  const handleLogout = useCallback(async (reason) => {
    // Log the logout event
    if (auth.currentUser) {
      await logAuthEvent(auth.currentUser.uid, 'logout', { reason });
    }
    
    // Navigate to login with session expired message
    if (reason.includes('expired')) {
      navigate('/login?session=expired');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleExtendSession = useCallback(() => {
    sessionManager.extendSession();
    setShowWarning(false);
    
    // Log session extension
    if (auth.currentUser) {
      logAuthEvent(auth.currentUser.uid, 'session_extended', {
        remainingTime: sessionManager.getRemainingTime()
      });
    }
  }, []);

  const handleUserLogout = useCallback(async () => {
    setShowWarning(false);
    await sessionManager.logout('User initiated logout');
  }, []);

  useEffect(() => {
    // Initialize session management when component mounts
    sessionManager.init(handleWarning, handleLogout);

    // Log session start
    if (auth.currentUser) {
      logAuthEvent(auth.currentUser.uid, 'session_start', {
        userAgent: navigator.userAgent
      });
    }

    // Cleanup on unmount
    return () => {
      sessionManager.cleanup();
    };
  }, [handleWarning, handleLogout]);

  return {
    showWarning,
    handleExtendSession,
    handleUserLogout,
    sessionManager
  };
};

export default useSessionManagement;