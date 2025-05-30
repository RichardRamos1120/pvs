import React, { useState, useEffect } from 'react';
import sessionManager from '../utils/sessionManager';

const SessionWarningModal = ({ show, onExtend, onLogout }) => {
  const [remainingTime, setRemainingTime] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    if (!show) return;

    const interval = setInterval(() => {
      const remaining = Math.ceil(sessionManager.getRemainingTime() / 1000);
      setRemainingTime(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onLogout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [show, onLogout]);

  if (!show) return null;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50" />
      
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg
              className="h-6 w-6 text-yellow-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Session Expiring Soon
          </h3>
          
          <p className="text-sm text-gray-500 mb-4">
            Your session will expire in {formatTime(remainingTime)} due to inactivity.
            Would you like to continue working?
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={onExtend}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue Session
            </button>
            
            <button
              onClick={onLogout}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;