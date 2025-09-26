/**
 * Impersonation Status Hook
 * 
 * This hook provides access to the current impersonation status and related functionality.
 * It now uses the centralized ImpersonationContext to avoid duplicate API calls
 * and provides a consistent interface for components that need impersonation state.
 * 
 * Key responsibilities:
 * - Provide access to centralized impersonation state
 * - Maintain backward compatibility with existing components
 * - Enable conditional rendering based on impersonation state
 * 
 * Usage:
 * - Use in components that need to know about impersonation status
 * - Conditionally render admin features based on impersonation state
 * - Show different UI elements during impersonation
 */
import { useImpersonationContext } from '../contexts/ImpersonationContext'

/**
 * Hook to access impersonation status
 * 
 * Provides real-time impersonation status from the centralized context.
 * This hook now delegates to the ImpersonationContext to avoid duplicate API calls.
 * 
 * @returns {UseImpersonationReturn} Impersonation status and controls
 */
export const useImpersonation = () => {
  return useImpersonationContext()
}

export default useImpersonation
