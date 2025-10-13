/**
 * AI Task Polling Context Provider
 *
 * This context provides global AI task polling functionality across the application.
 * It automatically resumes polling for any active AI tasks when the app loads,
 * ensuring seamless user experience across page refreshes.
 *
 * Key responsibilities:
 * - Initialize polling for any active tasks from localStorage
 * - Provide polling state to components throughout the app
 * - Handle cleanup of completed tasks
 * - Manage global polling state
 *
 * Usage:
 * - Wrap the app with AITaskPollingProvider
 * - Use useAITaskPollingContext hook to access global polling state
 * - Components can add/remove tasks from global polling
 */

import React, { createContext, useContext } from 'react';
import { useAITaskPolling, AITask } from '../hooks/useAITaskPolling';

interface AITaskPollingContextType {
  activeTasks: Map<string, AITask>;
  isPolling: boolean;
  addTask: (task: AITask) => void;
  removeTask: (taskId: string) => void;
  stopPolling: () => void;
}

const AITaskPollingContext = createContext<AITaskPollingContextType | undefined>(undefined);

export const useAITaskPollingContext = () => {
  const context = useContext(AITaskPollingContext);
  if (context === undefined) {
    throw new Error('useAITaskPollingContext must be used within an AITaskPollingProvider');
  }
  return context;
};

interface AITaskPollingProviderProps {
  children: React.ReactNode;
}

export const AITaskPollingProvider: React.FC<AITaskPollingProviderProps> = ({ children }) => {
  const { activeTasks, isPolling, addTask, removeTask, stopPolling } = useAITaskPolling({
    onTaskComplete: (task) => {
      // Task completion is handled by individual components
    },
    onTaskError: (task, error) => {
      console.error('AI task failed:', task, error);
      // Task errors are handled by individual components
    },
  });

  return (
    <AITaskPollingContext.Provider
      value={{
        activeTasks,
        isPolling,
        addTask,
        removeTask,
        stopPolling,
      }}
    >
      {children}
    </AITaskPollingContext.Provider>
  );
};
