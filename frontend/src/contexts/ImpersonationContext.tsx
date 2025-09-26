/**
 * Impersonation Context Provider
 * 
 * This module provides a centralized context for managing impersonation state across the application.
 * It eliminates duplicate API calls by maintaining a single source of truth for impersonation status
 * and providing shared state to all components that need it.
 * 
 * Key responsibilities:
 * - Centralize impersonation status management
 * - Eliminate duplicate API calls from multiple components
 * - Provide real-time status updates to all consumers
 * - Handle status polling and event-driven updates
 * - Manage session expiration and cleanup
 * 
 * Usage:
 * - Wrap the app with ImpersonationProvider
 * - Use useImpersonationContext hook in components that need impersonation state
 * - Components can subscribe to status changes without making their own API calls
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { impersonationService, ImpersonationStatus } from '../services/impersonationService'
import { useAuth } from './AuthContext'

interface ImpersonationContextType {
  /** Whether admin is currently impersonating a user */
  isImpersonating: boolean
  /** Current impersonation status details */
  status: ImpersonationStatus
  /** Whether status is being loaded */
  loading: boolean
  /** Refresh impersonation status manually */
  refreshStatus: () => Promise<void>
  /** Force immediate status check (for when impersonation starts) */
  forceStatusCheck: () => Promise<void>
  /** End current impersonation session */
  endImpersonation: () => Promise<void>
}

interface ImpersonationProviderProps {
  children: ReactNode
  /** Fallback polling interval in milliseconds (default: 120000 = 2 minutes) */
  fallbackInterval?: number
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined)

/**
 * Custom hook to access impersonation context
 * 
 * Provides access to centralized impersonation state and methods throughout the application.
 * Must be used within an ImpersonationProvider component to avoid runtime errors.
 * 
 * @returns {ImpersonationContextType} The impersonation context containing state and methods
 * @throws {Error} If used outside of ImpersonationProvider component
 */
export const useImpersonationContext = () => {
  const context = useContext(ImpersonationContext)
  if (context === undefined) {
    throw new Error('useImpersonationContext must be used within an ImpersonationProvider')
  }
  return context
}

/**
 * Provider component for impersonation context
 * 
 * Manages centralized impersonation state and provides it to all child components.
 * Handles status polling, event-driven updates, and session management.
 * 
 * @param {ImpersonationProviderProps} props - Component props
 * @returns {JSX.Element} Provider component
 */
export const ImpersonationProvider: React.FC<ImpersonationProviderProps> = ({
  children,
  fallbackInterval = 120000
}) => {
  const [status, setStatus] = useState<ImpersonationStatus>({ active: false })
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, loading: authLoading } = useAuth()

  // Fetch impersonation status
  const fetchStatus = useCallback(async () => {
    // Don't make API calls if not authenticated or auth is still loading
    if (!isAuthenticated || authLoading) {
      setStatus({ active: false })
      setLoading(false)
      return
    }

    try {
      const newStatus = await impersonationService.getImpersonationStatus()
      setStatus(newStatus)
    } catch (error) {
      console.error('Failed to fetch impersonation status:', error)
      // On error, assume not impersonating
      setStatus({ active: false })
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  // Manual refresh function
  const refreshStatus = useCallback(async () => {
    setLoading(true)
    await fetchStatus()
  }, [fetchStatus])

  // Force immediate status check (for when impersonation starts)
  const forceStatusCheck = useCallback(async () => {
    if (isAuthenticated && !authLoading) {
      await fetchStatus()
    }
  }, [fetchStatus, isAuthenticated, authLoading])

  // End impersonation session
  const endImpersonation = useCallback(async () => {
    try {
      await impersonationService.endImpersonation()
      setStatus({ active: false })
    } catch (error) {
      console.error('Failed to end impersonation:', error)
      throw error
    }
  }, [])

  // Set up hybrid event-driven status checking
  useEffect(() => {
    let fallbackIntervalId: NodeJS.Timeout

    // Check status on app load (only if authenticated)
    if (isAuthenticated && !authLoading) {
      fetchStatus()
    }

    // Event handlers for user activity
    const handleFocus = () => {
      if (isAuthenticated && !authLoading) {
        fetchStatus()
      }
    }

    const handleRouteChange = () => {
      if (isAuthenticated && !authLoading) {
        fetchStatus()
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && !authLoading) {
        fetchStatus()
      }
    }

    // Set up event listeners
    window.addEventListener('focus', handleFocus)
    window.addEventListener('popstate', handleRouteChange)
    window.addEventListener('visibilitychange', handleVisibilityChange)

    // Fallback: infrequent polling as safety net (every 2 minutes)
    // Only start polling if authenticated
    if (isAuthenticated && !authLoading) {
      fallbackIntervalId = setInterval(fetchStatus, fallbackInterval)
    }

    return () => {
      if (fallbackIntervalId) {
        clearInterval(fallbackIntervalId)
      }
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('popstate', handleRouteChange)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchStatus, fallbackInterval, isAuthenticated, authLoading])

  const contextValue: ImpersonationContextType = {
    isImpersonating: status.active,
    status,
    loading,
    refreshStatus,
    forceStatusCheck,
    endImpersonation
  }

  return (
    <ImpersonationContext.Provider value={contextValue}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export default ImpersonationProvider
