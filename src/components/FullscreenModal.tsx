import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useModal } from '../contexts/ModalContext';

const FullscreenModal = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  modalId,
  className = '',
  headerClassName = '',
  contentClassName = '',
  showCloseButton = true
}) => {
  const { registerModal, unregisterModal } = useModal();
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Register/unregister modal when opened/closed
  useEffect(() => {
    if (isOpen && modalId) {
      registerModal(modalId);
      return () => unregisterModal(modalId);
    }
  }, [isOpen, modalId, registerModal, unregisterModal]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className={`bg-white dark:bg-gray-800 shadow-lg flex flex-col ${
        isMobile 
          ? 'w-full h-full rounded-none' 
          : 'w-full max-w-4xl max-h-[90vh] rounded-lg mx-4'
      } ${className}`}>
        
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${headerClassName}`}>
            {title && (
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
              </div>
            )}
            
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default FullscreenModal;