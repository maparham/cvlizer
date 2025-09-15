import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '../authStore'
import api from '../../services/api'
import { createMockUser } from '../../test-utils'

// Mock the API
jest.mock('../../services/api')
const mockedApi = api as jest.Mocked<typeof api>

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false
    })
    
    // Reset mocks
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore())
      
      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('login', () => {
    it('should login successfully', async () => {
      const mockUser = createMockUser()
      const mockResponse = {
        data: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token'
        }
      }
      
      // Mock JWT decode
      const mockPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at
      }
      
      // Mock atob (base64 decode)
      global.atob = jest.fn().mockReturnValue(JSON.stringify(mockPayload))
      
      mockedApi.post.mockResolvedValue(mockResponse)
      
      const { result } = renderHook(() => useAuthStore())
      
      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password' })
      })
      
      expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password'
      })
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('access_token', 'mock-access-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token')
      
      expect(result.current.user).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        is_active: true,
        email_verified: true
      }))
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle login failure', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Invalid credentials'
          }
        }
      }
      
      mockedApi.post.mockRejectedValue(mockError)
      
      const { result } = renderHook(() => useAuthStore())
      
      await act(async () => {
        try {
          await result.current.login({ email: 'test@example.com', password: 'wrong-password' })
        } catch (error) {
          // Expected to throw
        }
      })
      
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Invalid credentials')
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      const mockUser = createMockUser({ email_verified: false })
      const mockResponse = {
        data: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token'
        }
      }
      
      const mockPayload = {
        sub: mockUser.id,
        email: mockUser.email
      }
      
      global.atob = jest.fn().mockReturnValue(JSON.stringify(mockPayload))
      mockedApi.post.mockResolvedValue(mockResponse)
      
      const { result } = renderHook(() => useAuthStore())
      
      await act(async () => {
        await result.current.register({ email: 'new@example.com', password: 'password' })
      })
      
      expect(mockedApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password'
      })
      
      expect(result.current.user).toEqual(expect.objectContaining({
        email: mockUser.email,
        email_verified: false // New registrations should be unverified
      }))
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('logout', () => {
    it('should logout and clear state', () => {
      // Set up authenticated state
      const mockUser = createMockUser()
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true
      })
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.logout()
      })
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token')
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('verifyToken', () => {
    it('should verify token successfully', async () => {
      const mockUser = createMockUser()
      mockLocalStorage.getItem.mockReturnValue('valid-token')
      mockedApi.get.mockResolvedValue({ data: mockUser })
      
      const { result } = renderHook(() => useAuthStore())
      
      await act(async () => {
        await result.current.verifyToken()
      })
      
      expect(mockedApi.get).toHaveBeenCalledWith('/auth/me')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.loading).toBe(false)
    })

    it('should handle invalid token', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token')
      mockedApi.get.mockRejectedValue(new Error('Unauthorized'))
      
      const { result } = renderHook(() => useAuthStore())
      
      await act(async () => {
        await result.current.verifyToken()
      })
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token')
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.loading).toBe(false)
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-refresh-token')
      
      const mockResponse = {
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        }
      }
      
      mockedApi.post.mockResolvedValue(mockResponse)
      
      const { result } = renderHook(() => useAuthStore())
      
      const success = await act(async () => {
        return await result.current.refreshToken()
      })
      
      expect(success).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('access_token', 'new-access-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token')
    })

    it('should handle refresh token failure', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-refresh-token')
      mockedApi.post.mockRejectedValue(new Error('Invalid refresh token'))
      
      const { result } = renderHook(() => useAuthStore())
      
      const success = await act(async () => {
        return await result.current.refreshToken()
      })
      
      expect(success).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should clear errors', () => {
      useAuthStore.setState({ error: 'Some error' })
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.clearError()
      })
      
      expect(result.current.error).toBeNull()
    })
  })
})
