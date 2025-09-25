/**
 * Impersonation Migration Utility
 * 
 * This module provides backward compatibility and migration support for the
 * secure impersonation implementation. It helps transition from the old
 * sessionStorage-based approach to the new secure server-side approach.
 */

import { validateImpersonationToken, validateImpersonationTokenFromString } from './impersonation'
import { sanitizeImpersonationData, validateImpersonationSession } from './security'

/**
 * Legacy impersonation validation with security improvements
 * 
 * This function provides backward compatibility while implementing security
 * improvements. It first tries the secure server-side approach, then falls
 * back to the legacy approach with enhanced security measures.
 * 
 * @returns {Promise<Object>} Validation result with isValid flag and optional userData
 */
export const validateImpersonationTokenLegacy = async (): Promise<{ isValid: boolean; userData?: any }> => {
  try {
    // First, try the secure server-side approach
    const secureResult = await validateImpersonationToken()
    if (secureResult.isValid) {
      return secureResult
    }
    
    // Fallback to legacy approach with security improvements
    return validateImpersonationTokenLegacyFallback()
    
  } catch (error) {
    return { isValid: false }
  }
}

/**
 * Legacy fallback with security improvements
 * 
 * This function implements the old sessionStorage approach but with
 * enhanced security measures including input sanitization and validation.
 */
const validateImpersonationTokenLegacyFallback = (): { isValid: boolean; userData?: any } => {
  try {
    // Check for token in sessionStorage (legacy approach)
    const impersonationToken = sessionStorage.getItem('impersonation_token')
    
    if (!impersonationToken) {
      return { isValid: false }
    }

    // Use the secure token validation with proper base64url decoding
    const result = validateImpersonationTokenFromString(impersonationToken)
    
    if (result.isValid && result.userData) {
      // Sanitize and validate the user data
      const sanitizedData = sanitizeImpersonationData(result.userData)
      
      if (validateImpersonationSession(sanitizedData)) {
        return {
          isValid: true,
          userData: sanitizedData
        }
      } else {
        return { isValid: false }
      }
    }
    
    return { isValid: false }

  } catch (error) {
    return { isValid: false }
  }
}

/**
 * Migration status checker
 * 
 * This function checks whether the application is using the new secure
 * impersonation endpoints or the legacy sessionStorage approach.
 * 
 * @returns {Promise<Object>} Migration status information
 */
export const checkImpersonationMigrationStatus = async (): Promise<{
  usingSecureEndpoints: boolean
  hasLegacyData: boolean
  recommendations: string[]
}> => {
  const recommendations: string[] = []
  
  // Check if secure endpoints are available
  let usingSecureEndpoints = false
  try {
    const response = await fetch('/api/admin/impersonation/validate', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    usingSecureEndpoints = response.status !== 404
  } catch (error) {
    // Secure endpoints not available
  }
  
  // Check for legacy data
  const hasLegacyData = !!(
    sessionStorage.getItem('impersonation_token') ||
    sessionStorage.getItem('impersonation_session_id') ||
    sessionStorage.getItem('impersonation_target_user')
  )
  
  // Generate recommendations
  if (!usingSecureEndpoints) {
    recommendations.push('Implement secure server-side impersonation endpoints')
    recommendations.push('Replace sessionStorage with httpOnly cookies')
  }
  
  if (hasLegacyData) {
    recommendations.push('Migrate existing impersonation data to secure storage')
    recommendations.push('Clear legacy sessionStorage data after migration')
  }
  
  if (usingSecureEndpoints && hasLegacyData) {
    recommendations.push('Complete migration by removing legacy data')
  }
  
  return {
    usingSecureEndpoints,
    hasLegacyData,
    recommendations
  }
}

/**
 * Clean up legacy impersonation data
 * 
 * This function safely removes legacy impersonation data from sessionStorage
 * after confirming that the secure endpoints are working properly through
 * functional verification.
 * 
 * @returns {Promise<boolean>} True if cleanup was successful
 */
export const cleanupLegacyImpersonationData = async (): Promise<boolean> => {
  try {
    // Verify secure endpoints are working
    const migrationStatus = await checkImpersonationMigrationStatus()
    
    if (!migrationStatus.usingSecureEndpoints) {
      return false
    }
    
    // Perform functional verification of secure token/endpoints
    // This tests that the secure endpoint actually accepts and validates tokens
    const secureTokenTest = await validateImpersonationToken()
    
    // Only proceed with cleanup if the secure token validation succeeds
    // This ensures the secure endpoints are actually functional, not just available
    if (!secureTokenTest.isValid) {
      // Secure endpoints exist but token validation failed
      // This could mean the user is not currently in an impersonation session
      // or the secure endpoints are not properly configured
      // In this case, we should still attempt a lightweight test to verify
      // the endpoint is functional (returns proper error responses)
      try {
        const testResponse = await fetch('/api/admin/impersonation/validate', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        // If we get a proper response (even 401/403), the endpoint is functional
        // If we get network errors or unexpected responses, don't proceed
        if (testResponse.status >= 400 && testResponse.status < 500) {
          // Endpoint is functional (returning proper auth errors)
          // Safe to proceed with cleanup
        } else if (testResponse.status >= 500) {
          // Server error - don't proceed with cleanup
          return false
        }
        // For 200 responses, we already checked secureTokenTest.isValid above
      } catch (endpointError) {
        // Network or other errors - don't proceed with cleanup
        return false
      }
    }
    
    // Clear legacy data only after functional verification succeeds
    sessionStorage.removeItem('impersonation_token')
    sessionStorage.removeItem('impersonation_session_id')
    sessionStorage.removeItem('impersonation_target_user')
    
    return true
    
  } catch (error) {
    return false
  }
}
