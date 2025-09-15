import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, createMockCV, setupTest } from '../../test-utils'
import Dashboard from '../Dashboard'
import { cvApi } from '../../services/api'
import { useCVStore } from '../../stores/cvStore'
import { useAuthStore } from '../../stores/authStore'

// Mock the stores
jest.mock('../../stores/cvStore')
jest.mock('../../stores/authStore')
jest.mock('../../services/api')

// Mock react-router-dom
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const mockedUseCVStore = useCVStore as jest.MockedFunction<typeof useCVStore>
const mockedUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockedCvApi = cvApi as jest.Mocked<typeof cvApi>

describe('Dashboard', () => {
  const mockLogout = jest.fn()
  const mockFetchCVs = jest.fn()
  const mockDeleteCV = jest.fn()
  const mockClearError = jest.fn()

  beforeEach(() => {
    setupTest()
    
    // Reset mocks
    mockNavigate.mockClear()
    mockLogout.mockClear()
    mockFetchCVs.mockClear()
    mockDeleteCV.mockClear()
    mockClearError.mockClear()

    // Mock auth store
    mockedUseAuthStore.mockReturnValue({
      user: { 
        id: '123', 
        email: 'test@example.com', 
        is_active: true, 
        email_verified: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      },
      logout: mockLogout,
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
      setError: jest.fn()
    })

    // Mock CV store
    mockedUseCVStore.mockReturnValue({
      cvs: [],
      currentCV: null,
      loading: false,
      uploading: false,
      error: null,
      hasUnparsedCVs: false,
      pollingInterval: null,
      fetchCVs: mockFetchCVs,
      fetchCV: jest.fn(),
      uploadCV: jest.fn(),
      updateCV: jest.fn(),
      deleteCV: mockDeleteCV,
      setCurrentCV: jest.fn(),
      clearError: mockClearError,
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
      addCV: jest.fn(),
      updateCVInList: jest.fn(),
      removeCVFromList: jest.fn(),
      setLoading: jest.fn(),
      setUploading: jest.fn(),
      setError: jest.fn()
    })
  })

  describe('rendering', () => {
    it('should render dashboard with no CVs', async () => {
      render(<Dashboard />)

      expect(screen.getByText('CV Optimizer')).toBeInTheDocument()
      expect(screen.getByText('My CVs')).toBeInTheDocument()
      expect(screen.getByText('Upload CV')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('No CVs uploaded yet')).toBeInTheDocument()
      })
    })

    it('should render dashboard with CVs', async () => {
      const mockCVs = [
        createMockCV({ original_filename: 'my-resume.pdf', is_parsed: true }),
        createMockCV({ 
          id: 'cv-456', 
          original_filename: 'another-cv.pdf', 
          is_parsed: false 
        })
      ]

      mockedUseCVStore.mockReturnValue({
        ...mockedUseCVStore(),
        cvs: mockCVs
      })

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('my-resume.pdf')).toBeInTheDocument()
        expect(screen.getByText('another-cv.pdf')).toBeInTheDocument()
      })

      // Should show parsing status for unparsed CV
      expect(screen.getByText('Parsing...')).toBeInTheDocument()
      expect(screen.getByText('AI is parsing your CV...')).toBeInTheDocument()
      
      // Should show edit button only for parsed CV
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons).toHaveLength(1)
    })

    it('should show parse error status', async () => {
      const mockCV = createMockCV({
        original_filename: 'error-cv.pdf',
        is_parsed: false,
        parse_error: 'Failed to parse PDF'
      })

      mockedUseCVStore.mockReturnValue({
        ...mockedUseCVStore(),
        cvs: [mockCV]
      })

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Parse Error')).toBeInTheDocument()
        expect(screen.getByText('Parsing failed: Failed to parse PDF')).toBeInTheDocument()
      })
    })
  })

  describe('loading states', () => {
    it('should show loading state', () => {
      mockedUseCVStore.mockReturnValue({
        ...mockedUseCVStore(),
        loading: true
      })

      render(<Dashboard />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show progress bar for parsing CVs', async () => {
      const mockCV = createMockCV({
        is_parsed: false,
        parse_error: undefined
      })

      mockedUseCVStore.mockReturnValue({
        ...mockedUseCVStore(),
        cvs: [mockCV]
      })

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
    })
  })

  describe('user interactions', () => {
    it('should navigate to CV editor when clicking edit', async () => {
      const user = userEvent.setup()
      const mockCV = createMockCV({ is_parsed: true })

      mockedUseCVStore.mockReturnValue({
        ...mockedUseCVStore(),
        cvs: [mockCV]
      })

      render(<Dashboard />)

      const editButton = await screen.findByText('Edit')
      await user.click(editButton)

      expect(mockNavigate).toHaveBeenCalledWith('/cv/cv-123')
    })

    it('should open upload dialog when clicking upload button', async () => {
      const user = userEvent.setup()
      
      render(<Dashboard />)

      const uploadButton = screen.getByRole('button', { name: /upload cv/i })
      await user.click(uploadButton)

      // CVUpload component should be rendered (mocked)
      // This would need proper mocking of CVUpload component
    })

    it('should open delete confirmation dialog', async () => {
      const user = userEvent.setup()
      const mockCV = createMockCV()

      mockedUseCVStore.mockReturnValue({
        ...mockedUseCVStore(),
        cvs: [mockCV]
      })

      render(<Dashboard />)

      const deleteButton = await screen.findByText('Delete')
      await user.click(deleteButton)

      expect(screen.getByText('Delete CV')).toBeInTheDocument()
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
    })

    it('should delete CV after confirmation', async () => {
      const user = userEvent.setup()
      const mockCV = createMockCV()

      mockedUseCVStore.mockReturnValue({
        ...mockedUseCVStore(),
        cvs: [mockCV]
      })

      render(<Dashboard />)

      // Click delete button
      const deleteButton = await screen.findByText('Delete')
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)

      expect(mockDeleteCV).toHaveBeenCalledWith('cv-123')
    })
  })

  describe('navigation', () => {
    it('should handle logout', async () => {
      const user = userEvent.setup()
      
      render(<Dashboard />)

      // Click account menu
      const accountButton = screen.getByLabelText('account of current user')
      await user.click(accountButton)

      // Click logout
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)

      expect(mockLogout).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('data fetching', () => {
    it('should fetch CVs on mount', () => {
      render(<Dashboard />)

      expect(mockFetchCVs).toHaveBeenCalled()
    })

    it('should handle API errors gracefully', () => {
      mockedUseCVStore.mockReturnValue({
        ...mockedUseCVStore(),
        error: 'Failed to fetch CVs'
      })

      // Should not crash and should show empty state or error message
      render(<Dashboard />)

      // In a real implementation, you might show an error message
      expect(screen.getByText('No CVs uploaded yet')).toBeInTheDocument()
    })
  })

  describe('file format and size display', () => {
    it('should display file information correctly', async () => {
      const mockCV = createMockCV({
        original_filename: 'resume.pdf',
        file_type: 'application/pdf',
        file_size: 2048000, // 2MB
        created_at: '2023-01-01T00:00:00Z'
      })

      mockedUseCVStore.mockReturnValue({
        ...mockedUseCVStore(),
        cvs: [mockCV]
      })

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('PDF')).toBeInTheDocument()
        expect(screen.getByText('2 MB • 1/1/2023')).toBeInTheDocument()
      })
    })
  })
})
