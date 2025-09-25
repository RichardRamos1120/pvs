import React, { createContext, useContext, useState, ReactNode } from 'react';

type ModalContextType = {
  openModals: Set<string>;
  registerModal: (modalId: string) => void;
  unregisterModal: (modalId: string) => void;
  hasOpenModals: boolean;
  openModalsCount: number;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [openModals, setOpenModals] = useState(new Set<string>());

  const registerModal = (modalId: string) => {
    setOpenModals(prev => new Set([...prev, modalId]));
  };

  const unregisterModal = (modalId: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      return newSet;
    });
  };

  const hasOpenModals = openModals.size > 0;

  return (
    <ModalContext.Provider value={{
      openModals,
      registerModal,
      unregisterModal,
      hasOpenModals,
      openModalsCount: openModals.size
    }}>
      {children}
    </ModalContext.Provider>
  );
};