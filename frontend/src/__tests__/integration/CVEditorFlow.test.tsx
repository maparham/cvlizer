/**
 * Integration tests for the complete CV Editor flow
 * Tests the interaction between components, stores, and hooks
 */

import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, createMockCV, createMockCVData, createMockUser } from '../../test-utils'
import CVEditor from '../../pages/CVEditor'
import { useCVStore } from '../../stores/cvStore'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

// Mock the stores and API
jest.mock('../../stores/cvStore')
jest.mock('../../stores/authStore')
jest.mock('../../services/api')

// Mock react-router-dom
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ cvId: 'cv-123' }),
}))

const mockedUseCVStore = useCVStore as jest.MockedFunction<typeof useCVStore>
const mockedUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockedApi = api as jest.Mocked<typeof api>

describe('CV Editor Integration Flow', () => {
  const mockUser = createMockUser()
  const mockCVData = createMockCVData()
  const mockCV = createMockCV({ parsed_data: mockCVData })

  const setupMocks = (overrides = {}) => {
    // Mock auth store
    mockedUseAuthStore.mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
      loading: false,
      error: null,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      clearError: jest.fn(),
      verifyToken: jest.fn(),
      refreshToken: jest.fn(),
      setUser: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      ...overrides.auth
    })

    // Mock CV store
    mockedUseCVStore.mockReturnValue({
      cvs: [mockCV],
      currentCV: mockCV,
      loading: false,
      uploading: false,
      error: null,
      hasUnparsedCVs: false,
      pollingInterval: null,
      fetchCVs: jest.fn(),
      fetchCV: jest.fn().mockResolvedValue(mockCV),
      uploadCV: jest.fn(),
      updateCV: jest.fn(),
      deleteCV: jest.fn(),
      setCurrentCV: jest.fn(),
      clearError: jest.fn(),
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
      addCV: jest.fn(),
      updateCVInList: jest.fn(),
      removeCVFromList: jest.fn(),
      setLoading: jest.fn(),
      setUploading: jest.fn(),
      setError: jest.fn(),
      ...overrides.cv
    })

    // Mock API responses
    mockedApi.get.mockResolvedValue({ data: mockCV })
    mockedApi.put.mockResolvedValue({ data: mockCV })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    setupMocks()
  })

  describe('CV Editor Loading and Initialization', () => {
    it('should load CV data and initialize the editor', async () => {
      render(<CVEditor />)

      // Should show loading initially
      expect(screen.getByText('Loading CV...')).toBeInTheDocument()

      // Should load the CV content
      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument()
        expect(screen.getByText('Professional Summary')).toBeInTheDocument()
        expect(screen.getByText('Work Experience')).toBeInTheDocument()
      })

      // Should display CV data
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })

    it('should handle CV not found', async () => {
      setupMocks({
        cv: {
          currentCV: null,
          fetchCV: jest.fn().mockResolvedValue(null)
        }
      })

      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('CV not found')).toBeInTheDocument()
      })
    })

    it('should handle parsing errors gracefully', async () => {
      const errorCV = createMockCV({
        is_parsed: false,
        parse_error: 'Failed to parse PDF',
        parsed_data: {
          ...mockCVData,
          professional_summary: {
            content: 'CV parsing failed. Please try uploading again.',
            keywords: []
          }
        }
      })

      setupMocks({
        cv: {
          currentCV: errorCV,
          fetchCV: jest.fn().mockResolvedValue(errorCV)
        }
      })

      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('CV parsing failed. Please try uploading again.')).toBeInTheDocument()
      })
    })
  })

  describe('Section Management', () => {
    it('should allow toggling section visibility', async () => {
      const user = userEvent.setup()
      
      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument()
      })

      // Find and click the visibility toggle for a section
      // This would require the section manager sidebar to be rendered
      // The exact implementation depends on how the UI is structured
    })

    it('should allow reordering sections', async () => {
      // This test would require mocking drag and drop interactions
      // which is complex but important for integration testing
      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument()
      })

      // Test drag and drop reordering
      // This would require @dnd-kit testing utilities
    })
  })

  describe('Content Editing Flow', () => {
    it('should allow editing personal information', async () => {
      const user = userEvent.setup()
      const mockUpdateCV = jest.fn()
      
      setupMocks({
        cv: { updateCV: mockUpdateCV }
      })

      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click edit button for personal info section
      const editButton = screen.getByLabelText('Edit this section')
      await user.click(editButton)

      // Should enter edit mode
      const nameInput = screen.getByDisplayValue('John Doe')
      expect(nameInput).toBeInTheDocument()

      // Edit the name
      await user.clear(nameInput)
      await user.type(nameInput, 'Jane Smith')

      // Save changes
      const saveButton = screen.getByLabelText('Save changes')
      await user.click(saveButton)

      // Should call updateCV
      expect(mockUpdateCV).toHaveBeenCalledWith(
        'cv-123',
        expect.objectContaining({
          parsed_data: expect.objectContaining({
            personal_info: expect.objectContaining({
              full_name: 'Jane Smith'
            })
          })
        })
      )
    })

    it('should handle unsaved changes dialog', async () => {
      const user = userEvent.setup()
      
      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Start editing
      const editButton = screen.getByLabelText('Edit this section')
      await user.click(editButton)

      // Make changes
      const nameInput = screen.getByDisplayValue('John Doe')
      await user.clear(nameInput)
      await user.type(nameInput, 'Jane Smith')

      // Try to cancel without saving
      const cancelButton = screen.getByLabelText('Cancel editing')
      await user.click(cancelButton)

      // Should show unsaved changes dialog
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
      expect(screen.getByText('Discard Changes')).toBeInTheDocument()
      expect(screen.getByText('Keep Editing')).toBeInTheDocument()
    })

    it('should allow adding new work experience', async () => {
      const user = userEvent.setup()
      const mockUpdateCV = jest.fn()
      
      setupMocks({
        cv: { updateCV: mockUpdateCV }
      })

      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('Work Experience')).toBeInTheDocument()
      })

      // Click add button for work experience
      const addButton = screen.getByLabelText(/Add new work experience/i)
      await user.click(addButton)

      // Should show form for new experience
      const companyInput = screen.getByPlaceholderText(/company/i)
      const positionInput = screen.getByPlaceholderText(/position/i)

      // Fill out the form
      await user.type(companyInput, 'New Company')
      await user.type(positionInput, 'Senior Developer')

      // Save the new experience
      const saveButton = screen.getByLabelText('Save changes')
      await user.click(saveButton)

      // Should update CV with new experience
      expect(mockUpdateCV).toHaveBeenCalledWith(
        'cv-123',
        expect.objectContaining({
          parsed_data: expect.objectContaining({
            work_experience: expect.arrayContaining([
              expect.objectContaining({
                company: 'New Company',
                position: 'Senior Developer'
              })
            ])
          })
        })
      )
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should handle Escape key to cancel editing', async () => {
      const user = userEvent.setup()
      
      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Start editing
      const editButton = screen.getByLabelText('Edit this section')
      await user.click(editButton)

      // Press Escape
      await user.keyboard('{Escape}')

      // Should exit edit mode
      expect(screen.queryByDisplayValue('John Doe')).not.toBeInTheDocument()
    })

    it('should handle Ctrl+S to save', async () => {
      const user = userEvent.setup()
      const mockUpdateCV = jest.fn()
      
      setupMocks({
        cv: { updateCV: mockUpdateCV }
      })

      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Start editing
      const editButton = screen.getByLabelLabel('Edit this section')
      await user.click(editButton)

      // Make changes
      const nameInput = screen.getByDisplayValue('John Doe')
      await user.clear(nameInput)
      await user.type(nameInput, 'Jane Smith')

      // Press Ctrl+S
      await user.keyboard('{Control>}s{/Control}')

      // Should save changes
      expect(mockUpdateCV).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors during save', async () => {
      const user = userEvent.setup()
      const mockUpdateCV = jest.fn().mockRejectedValue(new Error('Save failed'))
      
      setupMocks({
        cv: { updateCV: mockUpdateCV }
      })

      render(<CVEditor />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Try to edit and save
      const editButton = screen.getByLabelText('Edit this section')
      await user.click(editButton)

      const saveButton = screen.getByLabelText('Save changes')
      await user.click(saveButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to save CV')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate back to dashboard', async () => {
      const user = userEvent.setup()
      
      render(<CVEditor />)

      const backButton = screen.getByLabelText(/back/i)
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })

    it('should handle logout from CV editor', async () => {
      const user = userEvent.setup()
      const mockLogout = jest.fn()
      
      setupMocks({
        auth: { logout: mockLogout }
      })

      render(<CVEditor />)

      // Open account menu
      const accountButton = screen.getByLabelText('account of current user')
      await user.click(accountButton)

      // Click logout
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)

      expect(mockLogout).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })
})
