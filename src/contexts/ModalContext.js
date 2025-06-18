import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [openModals, setOpenModals] = useState(new Set());

  const registerModal = (modalId) => {
    setOpenModals(prev => new Set([...prev, modalId]));
  };

  const unregisterModal = (modalId) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      return newSet;
    });
  };

  const hasOpenModals = openModals.size > 0;

  return (
    <ModalContext.Provider value={{
      registerModal,
      unregisterModal,
      hasOpenModals,
      openModalsCount: openModals.size
    }}>
      {children}
    </ModalContext.Provider>
  );
};