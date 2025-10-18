/**
 * CV Context
 *
 * This module provides a React context for the current CV ID.
 * It allows child components to access the current CV ID without prop drilling.
 * This is particularly useful for notification system to automatically associate
 * notifications with the current CV.
 */
import React, { createContext, useContext, ReactNode } from "react";

interface CVContextType {
  cvId?: string;
}

const CVContext = createContext<CVContextType | undefined>(undefined);

interface CVProviderProps {
  cvId?: string;
  children: ReactNode;
}

export const CVProvider: React.FC<CVProviderProps> = ({ cvId, children }) => {
  return (
    <CVContext.Provider value={{ cvId }}>
      {children}
    </CVContext.Provider>
  );
};

export const useCVContext = () => {
  const context = useContext(CVContext);
  if (context === undefined) {
    // Return empty object if used outside CVProvider (e.g., Dashboard)
    return { cvId: undefined };
  }
  return context;
};
