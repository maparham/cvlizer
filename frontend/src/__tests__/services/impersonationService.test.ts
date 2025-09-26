/**
 * Impersonation Service Tests
 * 
 * This module provides comprehensive tests for the impersonation service,
 * including API communication, error handling, and data transformation.
 */

// Mock the API client before importing anything
jest.mock('../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}))

import { impersonationService, ImpersonationError } from '../../services/impersonationService'
import { apiClient } from '../../services/api'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('ImpersonationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('startImpersonation', () => {
    it('should start impersonation successfully', async () => {
      const mockResponse = {
        id: 'session-123',
        target_user_id: 'target-123',
        target_user_email: 'target@example.com',
        started_at: '2023-01-01T00:00:00Z',
        expires_at: '2023-01-01T01:00:00Z',
        remaining_seconds: 3600,
        justification: 'Testing'
      }

      mockApiClient.post.mockResolvedValue({ data: mockResponse })

      const request = {
        target_user_id: 'target-123',
        justification: 'Testing'
      }

      const result = await impersonationService.startImpersonation(request)

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/impersonations/start', request)
      expect(result).toEqual(mockResponse)
    })

    it('should handle 403 Forbidden error', async () => {
      const error = {
        response: {
          status: 403,
          data: { detail: 'Admin privileges required' }
        }
      }
      mockApiClient.post.mockRejectedValue(error)

      const request = {
        target_user_id: 'target-123',
        justification: 'Testing'
      }

      await expect(impersonationService.startImpersonation(request))
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.startImpersonation(request)
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Admin privileges required')
        expect((error as ImpersonationError).statusCode).toBe(403)
        expect((error as ImpersonationError).code).toBe('ADMIN_REQUIRED')
      }
    })

    it('should handle 429 Rate Limit error', async () => {
      const error = {
        response: {
          status: 429,
          data: { detail: 'Rate limit exceeded' }
        }
      }
      mockApiClient.post.mockRejectedValue(error)

      const request = {
        target_user_id: 'target-123',
        justification: 'Testing'
      }

      await expect(impersonationService.startImpersonation(request))
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.startImpersonation(request)
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Rate limit exceeded')
        expect((error as ImpersonationError).statusCode).toBe(429)
        expect((error as ImpersonationError).code).toBe('RATE_LIMITED')
      }
    })

    it('should handle generic API error', async () => {
      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      }
      mockApiClient.post.mockRejectedValue(error)

      const request = {
        target_user_id: 'target-123',
        justification: 'Testing'
      }

      await expect(impersonationService.startImpersonation(request))
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.startImpersonation(request)
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Internal server error')
        expect((error as ImpersonationError).statusCode).toBe(500)
      }
    })

    it('should handle network error', async () => {
      const error = new Error('Network error')
      mockApiClient.post.mockRejectedValue(error)

      const request = {
        target_user_id: 'target-123',
        justification: 'Testing'
      }

      await expect(impersonationService.startImpersonation(request))
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.startImpersonation(request)
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Failed to start impersonation session')
      }
    })
  })

  describe('endImpersonation', () => {
    it('should end impersonation successfully', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} })

      await impersonationService.endImpersonation()

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/impersonations/end')
    })

    it('should handle 404 Not Found (session already ended)', async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'Session not found' }
        }
      }
      mockApiClient.post.mockRejectedValue(error)

      // Should not throw error for 404
      await expect(impersonationService.endImpersonation()).resolves.toBeUndefined()
    })

    it('should handle other API errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      }
      mockApiClient.post.mockRejectedValue(error)

      await expect(impersonationService.endImpersonation())
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.endImpersonation()
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Internal server error')
        expect((error as ImpersonationError).statusCode).toBe(500)
      }
    })

    it('should handle network error', async () => {
      const error = new Error('Network error')
      mockApiClient.post.mockRejectedValue(error)

      await expect(impersonationService.endImpersonation())
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.endImpersonation()
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Failed to end impersonation session')
      }
    })
  })

  describe('getImpersonationStatus', () => {
    it('should get impersonation status successfully', async () => {
      const mockResponse = {
        active: true,
        target_user: {
          id: 'target-123',
          email: 'target@example.com'
        },
        expires_at: '2023-01-01T01:00:00Z',
        remaining_seconds: 3600,
        session_id: 'session-123'
      }

      mockApiClient.get.mockResolvedValue({ data: mockResponse })

      const result = await impersonationService.getImpersonationStatus()

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/impersonation/status')
      expect(result).toEqual(mockResponse)
    })

    it('should handle API error and return inactive status', async () => {
      const error = new Error('API error')
      mockApiClient.get.mockRejectedValue(error)

      const result = await impersonationService.getImpersonationStatus()

      expect(result).toEqual({ active: false })
    })

    it('should handle network error and return inactive status', async () => {
      const error = new Error('Network error')
      mockApiClient.get.mockRejectedValue(error)

      const result = await impersonationService.getImpersonationStatus()

      expect(result).toEqual({ active: false })
    })
  })

  describe('getActiveSessions', () => {
    it('should get active sessions successfully', async () => {
      const mockResponse = [
        {
          id: 'session-1',
          admin_id: 'admin-123',
          admin_email: 'admin@example.com',
          target_user_id: 'target-123',
          target_user_email: 'target@example.com',
          started_at: '2023-01-01T00:00:00Z',
          expires_at: '2023-01-01T01:00:00Z',
          remaining_seconds: 3600,
          justification: 'Testing'
        }
      ]

      mockApiClient.get.mockResolvedValue({ data: mockResponse })

      const result = await impersonationService.getActiveSessions(10, 0)

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/impersonations/active', {
        params: { limit: 10, offset: 0 }
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle API error', async () => {
      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      }
      mockApiClient.get.mockRejectedValue(error)

      await expect(impersonationService.getActiveSessions())
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.getActiveSessions()
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Internal server error')
        expect((error as ImpersonationError).statusCode).toBe(500)
      }
    })

    it('should handle network error', async () => {
      const error = new Error('Network error')
      mockApiClient.get.mockRejectedValue(error)

      await expect(impersonationService.getActiveSessions())
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.getActiveSessions()
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Failed to get active sessions')
      }
    })
  })

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} })

      await impersonationService.revokeSession('session-123')

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/impersonations/revoke/session-123')
    })

    it('should handle 404 Not Found error', async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'Session not found' }
        }
      }
      mockApiClient.post.mockRejectedValue(error)

      await expect(impersonationService.revokeSession('nonexistent-session'))
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.revokeSession('nonexistent-session')
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Session not found or already ended')
        expect((error as ImpersonationError).statusCode).toBe(404)
        expect((error as ImpersonationError).code).toBe('SESSION_NOT_FOUND')
      }
    })

    it('should handle other API errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      }
      mockApiClient.post.mockRejectedValue(error)

      await expect(impersonationService.revokeSession('session-123'))
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.revokeSession('session-123')
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Internal server error')
        expect((error as ImpersonationError).statusCode).toBe(500)
      }
    })

    it('should handle network error', async () => {
      const error = new Error('Network error')
      mockApiClient.post.mockRejectedValue(error)

      await expect(impersonationService.revokeSession('session-123'))
        .rejects.toThrow(ImpersonationError)

      try {
        await impersonationService.revokeSession('session-123')
      } catch (error) {
        expect(error).toBeInstanceOf(ImpersonationError)
        expect((error as ImpersonationError).message).toBe('Failed to revoke session')
      }
    })
  })

  describe('formatRemainingTime', () => {
    it('should format time correctly for positive seconds', () => {
      expect(impersonationService.formatRemainingTime(3661)).toBe('61:01')
      expect(impersonationService.formatRemainingTime(3600)).toBe('60:00')
      expect(impersonationService.formatRemainingTime(3599)).toBe('59:59')
      expect(impersonationService.formatRemainingTime(60)).toBe('1:00')
      expect(impersonationService.formatRemainingTime(59)).toBe('0:59')
      expect(impersonationService.formatRemainingTime(1)).toBe('0:01')
    })

    it('should handle zero and negative seconds', () => {
      expect(impersonationService.formatRemainingTime(0)).toBe('0:00')
      expect(impersonationService.formatRemainingTime(-1)).toBe('0:00')
      expect(impersonationService.formatRemainingTime(-60)).toBe('0:00')
    })
  })

  describe('isSessionExpiringSoon', () => {
    it('should return true for sessions expiring soon', () => {
      expect(impersonationService.isSessionExpiringSoon(299)).toBe(true) // 4:59
      expect(impersonationService.isSessionExpiringSoon(1)).toBe(true)   // 0:01
      expect(impersonationService.isSessionExpiringSoon(60)).toBe(true)  // 1:00
    })

    it('should return false for sessions not expiring soon', () => {
      expect(impersonationService.isSessionExpiringSoon(300)).toBe(false) // 5:00
      expect(impersonationService.isSessionExpiringSoon(3600)).toBe(false) // 60:00
      expect(impersonationService.isSessionExpiringSoon(0)).toBe(false)    // 0:00
      expect(impersonationService.isSessionExpiringSoon(-1)).toBe(false)   // negative
    })
  })
})
