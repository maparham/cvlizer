/**
 * Activity Logger Hook
 * 
 * This hook provides easy integration of the activity logger with React components,
 * automatically initializing the logger when a user is authenticated and providing
 * convenient methods for logging various user activities.
 * 
 * Usage:
 * - Automatically initializes when user is authenticated
 * - Provides methods for logging common activities
 * - Handles session management and cleanup
 */
import { useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { activityLogger } from '../services/activityLogger'

export const useActivityLogger = () => {
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Initialize activity logger with user ID
      activityLogger.init(user.id)
      
      // Log page view on initialization (only once per session)
      activityLogger.logPageView()
    }

    // Cleanup on unmount - only end session if user was authenticated
    return () => {
      if (isAuthenticated && user?.id) {
        activityLogger.endSession()
      }
    }
  }, [isAuthenticated, user?.id])

  // Return logger methods for manual use - memoized to prevent re-renders
  return useMemo(() => ({
    logUserAction: activityLogger.logUserAction.bind(activityLogger),
    logError: activityLogger.logError.bind(activityLogger),
    logFormSubmission: activityLogger.logFormSubmission.bind(activityLogger),
    logFileUpload: activityLogger.logFileUpload.bind(activityLogger),
    logAPICall: activityLogger.logAPICall.bind(activityLogger),
    logPageView: activityLogger.logPageView.bind(activityLogger),
    getSessionId: activityLogger.getSessionId.bind(activityLogger),
    setEnabled: activityLogger.setEnabled.bind(activityLogger)
  }), [])
}
