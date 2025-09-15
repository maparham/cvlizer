import { act, renderHook } from '@testing-library/react'
import { useCVStore } from '../cvStore'
import { cvApi } from '../../services/api'
import { createMockCV, createMockCVData } from '../../test-utils'

// Mock the API
jest.mock('../../services/api')
const mockedCvApi = cvApi as jest.Mocked<typeof cvApi>

describe('useCVStore', () => {
  beforeEach(() => {
    // Reset store state
    useCVStore.setState({
      cvs: [],
      currentCV: null,
      loading: false,
      uploading: false,
      error: null,
      hasUnparsedCVs: false,
      pollingInterval: null
    })
    
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useCVStore())
      
      expect(result.current.cvs).toEqual([])
      expect(result.current.currentCV).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.uploading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.hasUnparsedCVs).toBe(false)
    })
  })

  describe('fetchCVs', () => {
    it('should fetch CVs successfully', async () => {
      const mockCVs = [createMockCV(), createMockCV({ id: 'cv-456' })]
      mockedCvApi.getCVs.mockResolvedValue({ cvs: mockCVs })
      
      const { result } = renderHook(() => useCVStore())
      
      await act(async () => {
        await result.current.fetchCVs()
      })
      
      expect(mockedCvApi.getCVs).toHaveBeenCalled()
      expect(result.current.cvs).toEqual(mockCVs)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.hasUnparsedCVs).toBe(false)
    })

    it('should detect unparsed CVs and start polling', async () => {
      const unparsedCV = createMockCV({ is_parsed: false, parse_error: undefined })
      const parsedCV = createMockCV({ id: 'cv-456', is_parsed: true })
      const mockCVs = [unparsedCV, parsedCV]
      
      mockedCvApi.getCVs.mockResolvedValue({ cvs: mockCVs })
      
      const { result } = renderHook(() => useCVStore())
      
      await act(async () => {
        await result.current.fetchCVs()
      })
      
      expect(result.current.hasUnparsedCVs).toBe(true)
      // Polling should start - we can't easily test the interval without jest timers
    })

    it('should handle fetch error', async () => {
      const mockError = new Error('Network error')
      mockedCvApi.getCVs.mockRejectedValue(mockError)
      
      const { result } = renderHook(() => useCVStore())
      
      await act(async () => {
        await result.current.fetchCVs()
      })
      
      expect(result.current.cvs).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Failed to fetch CVs')
    })
  })

  describe('fetchCV', () => {
    it('should fetch a specific CV successfully', async () => {
      const mockCV = createMockCV()
      mockedCvApi.getCV.mockResolvedValue(mockCV)
      
      const { result } = renderHook(() => useCVStore())
      
      const cv = await act(async () => {
        return await result.current.fetchCV('cv-123')
      })
      
      expect(mockedCvApi.getCV).toHaveBeenCalledWith('cv-123')
      expect(result.current.currentCV).toEqual(mockCV)
      expect(cv).toEqual(mockCV)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should update CV in list when fetching', async () => {
      const mockCV = createMockCV()
      const existingCVs = [mockCV, createMockCV({ id: 'cv-456' })]
      
      // Set up existing state
      useCVStore.setState({ cvs: existingCVs })
      
      const updatedCV = { ...mockCV, updated_at: '2023-12-01T00:00:00Z' }
      mockedCvApi.getCV.mockResolvedValue(updatedCV)
      
      const { result } = renderHook(() => useCVStore())
      
      await act(async () => {
        await result.current.fetchCV('cv-123')
      })
      
      expect(result.current.cvs[0]).toEqual(updatedCV)
    })
  })

  describe('uploadCV', () => {
    it('should upload CV successfully', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const mockCV = createMockCV({ is_parsed: false })
      
      mockedCvApi.uploadCV.mockResolvedValue(mockCV)
      
      const { result } = renderHook(() => useCVStore())
      
      const cv = await act(async () => {
        return await result.current.uploadCV(mockFile)
      })
      
      expect(mockedCvApi.uploadCV).toHaveBeenCalledWith(mockFile)
      expect(result.current.cvs).toContain(mockCV)
      expect(result.current.hasUnparsedCVs).toBe(true)
      expect(result.current.uploading).toBe(false)
      expect(cv).toEqual(mockCV)
    })

    it('should handle upload error', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const mockError = new Error('Upload failed')
      
      mockedCvApi.uploadCV.mockRejectedValue(mockError)
      
      const { result } = renderHook(() => useCVStore())
      
      await expect(act(async () => {
        await result.current.uploadCV(mockFile)
      })).rejects.toThrow('Failed to upload CV')
      
      expect(result.current.uploading).toBe(false)
      expect(result.current.error).toBe('Failed to upload CV')
    })
  })

  describe('updateCV', () => {
    it('should update CV successfully', async () => {
      const originalCV = createMockCV()
      const updatedCVData = createMockCVData({ 
        personal_info: { ...createMockCVData().personal_info, full_name: 'Jane Doe' }
      })
      const updatedCV = { ...originalCV, parsed_data: updatedCVData }
      
      // Set up initial state
      useCVStore.setState({ 
        cvs: [originalCV], 
        currentCV: originalCV 
      })
      
      mockedCvApi.updateCV.mockResolvedValue(updatedCV)
      
      const { result } = renderHook(() => useCVStore())
      
      const cv = await act(async () => {
        return await result.current.updateCV('cv-123', { parsed_data: updatedCVData })
      })
      
      expect(mockedCvApi.updateCV).toHaveBeenCalledWith('cv-123', { parsed_data: updatedCVData })
      expect(result.current.currentCV).toEqual(updatedCV)
      expect(result.current.cvs[0]).toEqual(updatedCV)
      expect(cv).toEqual(updatedCV)
    })
  })

  describe('deleteCV', () => {
    it('should delete CV successfully', async () => {
      const mockCV = createMockCV()
      const otherCV = createMockCV({ id: 'cv-456' })
      
      // Set up initial state
      useCVStore.setState({ 
        cvs: [mockCV, otherCV], 
        currentCV: mockCV 
      })
      
      mockedCvApi.deleteCV.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useCVStore())
      
      await act(async () => {
        await result.current.deleteCV('cv-123')
      })
      
      expect(mockedCvApi.deleteCV).toHaveBeenCalledWith('cv-123')
      expect(result.current.cvs).toEqual([otherCV])
      expect(result.current.currentCV).toBeNull()
    })

    it('should handle delete error', async () => {
      const mockError = new Error('Delete failed')
      mockedCvApi.deleteCV.mockRejectedValue(mockError)
      
      const { result } = renderHook(() => useCVStore())
      
      await expect(act(async () => {
        await result.current.deleteCV('cv-123')
      })).rejects.toThrow('Failed to delete CV')
      
      expect(result.current.error).toBe('Failed to delete CV')
    })
  })

  describe('utility actions', () => {
    it('should set current CV', () => {
      const mockCV = createMockCV()
      const { result } = renderHook(() => useCVStore())
      
      act(() => {
        result.current.setCurrentCV(mockCV)
      })
      
      expect(result.current.currentCV).toEqual(mockCV)
    })

    it('should clear error', () => {
      useCVStore.setState({ error: 'Some error' })
      const { result } = renderHook(() => useCVStore())
      
      act(() => {
        result.current.clearError()
      })
      
      expect(result.current.error).toBeNull()
    })

    it('should start and stop polling', () => {
      const { result } = renderHook(() => useCVStore())
      
      act(() => {
        result.current.startPolling()
      })
      
      expect(result.current.pollingInterval).toBeTruthy()
      
      act(() => {
        result.current.stopPolling()
      })
      
      expect(result.current.pollingInterval).toBeNull()
    })
  })

  describe('internal actions', () => {
    it('should add CV to list', () => {
      const mockCV = createMockCV()
      const { result } = renderHook(() => useCVStore())
      
      act(() => {
        result.current.addCV(mockCV)
      })
      
      expect(result.current.cvs).toContain(mockCV)
    })

    it('should update CV in list', () => {
      const originalCV = createMockCV()
      const updatedCV = { ...originalCV, updated_at: '2023-12-01T00:00:00Z' }
      
      useCVStore.setState({ cvs: [originalCV] })
      
      const { result } = renderHook(() => useCVStore())
      
      act(() => {
        result.current.updateCVInList(updatedCV)
      })
      
      expect(result.current.cvs[0]).toEqual(updatedCV)
    })

    it('should remove CV from list', () => {
      const mockCV = createMockCV()
      const otherCV = createMockCV({ id: 'cv-456' })
      
      useCVStore.setState({ cvs: [mockCV, otherCV] })
      
      const { result } = renderHook(() => useCVStore())
      
      act(() => {
        result.current.removeCVFromList('cv-123')
      })
      
      expect(result.current.cvs).toEqual([otherCV])
    })
  })
})
