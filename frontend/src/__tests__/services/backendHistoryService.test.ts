/**
 * Tests for Backend CV History Service
 * 
 * Tests the service that manages CV version history using the backend API,
 * including snapshot creation, history retrieval, and diff computation.
 */

import { BackendCVHistoryService, DiffChange, CVDiffResult } from '../../services/backendHistoryService'
import { CVData, CVHistoryEntry } from '../../types'
import api from '../../services/api'

// Mock the API service
jest.mock('../../services/api')
const mockedApi = api as jest.Mocked<typeof api>

describe('BackendCVHistoryService', () => {
  let historyService: BackendCVHistoryService
  
  const mockCVData: CVData = {
    personal_info: {
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '',
      location: 'New York, NY',
      linkedin_url: '',
      website_url: ''
    },
    work_experience: [
      {
        id: 'work_123',
        company: 'TechCorp',
        position: 'Software Developer',
        location: 'San Francisco, CA',
        start_date: '2023-01-01',
        end_date: '2024-01-01',
        current: false,
        description: 'Developed web applications',
        achievements: [],
        technologies: []
      }
    ],
    education: [],
    skills: {
      technical: ['JavaScript', 'Python'],
      soft: ['Communication'],
      languages: []
    }
  }

  const mockHistoryEntry: CVHistoryEntry = {
    id: 'history_123',
    timestamp: '2024-01-01T00:00:00Z',
    cvData: mockCVData,
    changeType: 'manual_save',
    description: 'Updated work experience',
    isAutomatic: false,
    isInitial: false,
    label: null,
    dataSize: 1024
  }

  beforeEach(() => {
    historyService = new BackendCVHistoryService()
    jest.clearAllMocks()
  })

  describe('createSnapshot', () => {
    it('should create a history snapshot successfully', async () => {
      const mockResponse = {
        data: {
          id: 'history_123',
          changeType: 'manual_save',
          description: 'Test snapshot',
          isAutomatic: false,
          isInitial: false,
          label: null,
          dataSize: 1024,
          timestamp: '2024-01-01T00:00:00Z'
        }
      }
      
      mockedApi.post.mockResolvedValue(mockResponse)
      
      const result = await historyService.createSnapshot('cv_123', mockCVData, {
        changeType: 'manual_save',
        description: 'Test snapshot',
        isAutomatic: false,
        label: null
      })
      
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/cvs/cv_123/history',
        expect.objectContaining({
          cv_data: mockCVData,
          change_type: 'manual_save',
          description: 'Test snapshot'
        })
      )
      
      expect(result.id).toBe('history_123')
      expect(result.description).toBe('Test snapshot')
    })

    it('should handle API errors gracefully', async () => {
      mockedApi.post.mockRejectedValue(new Error('Network error'))
      
      await expect(historyService.createSnapshot('cv_123', mockCVData, {
        changeType: 'manual_save',
        description: 'Test snapshot',
        isAutomatic: false,
        label: null
      })).rejects.toThrow('Failed to create history snapshot')
    })
  })

  describe('getHistory', () => {
    it('should retrieve history entries successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'history_1',
            changeType: 'initial_load',
            description: 'Original version',
            isAutomatic: true,
            isInitial: true,
            label: 'Initial CV',
            dataSize: 1024,
            timestamp: '2024-01-01T00:00:00Z',
            cvData: mockCVData
          },
          {
            id: 'history_2',
            changeType: 'manual_save',
            description: 'Updated position',
            isAutomatic: false,
            isInitial: false,
            label: null,
            dataSize: 1100,
            timestamp: '2024-01-02T00:00:00Z',
            cvData: mockCVData
          }
        ]
      }
      
      mockedApi.get.mockResolvedValue(mockResponse)
      
      const result = await historyService.getHistory('cv_123')
      
      expect(mockedApi.get).toHaveBeenCalledWith('/api/cvs/cv_123/history')
      expect(result).toHaveLength(2)
      expect(result[0].isInitial).toBe(true)
      expect(result[1].description).toBe('Updated position')
    })

    it('should handle empty history', async () => {
      mockedApi.get.mockResolvedValue({ data: [] })
      
      const result = await historyService.getHistory('cv_123')
      
      expect(result).toHaveLength(0)
    })
  })

  describe('getDiff', () => {
    it('should compute diff between versions successfully', async () => {
      const mockDiffResponse: CVDiffResult = {
        changes: [
          {
            type: 'field_changed',
            section: 'work_experience',
            description: 'Work Experience: Position changed from "Developer" to "Senior Developer"',
            details: [],
            icon: 'edit',
            color: 'warning'
          }
        ],
        summary: '1 Change',
        total_changes: 1
      }
      
      mockedApi.get.mockResolvedValue({ data: mockDiffResponse })
      
      const result = await historyService.getDiff('cv_123', 'history_target', 'history_original')
      
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/api/cvs/cv_123/history/history_target/diff?compare_to=history_original'
      )
      
      expect(result.total_changes).toBe(1)
      expect(result.summary).toBe('1 Change')
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].description).toContain('Position changed')
    })

    it('should handle diff without compare_to parameter', async () => {
      const mockDiffResponse: CVDiffResult = {
        changes: [],
        summary: 'No changes',
        total_changes: 0
      }
      
      mockedApi.get.mockResolvedValue({ data: mockDiffResponse })
      
      await historyService.getDiff('cv_123', 'history_target')
      
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/api/cvs/cv_123/history/history_target/diff'
      )
    })

    it('should handle text diff data', async () => {
      const mockDiffResponse: CVDiffResult = {
        changes: [
          {
            type: 'field_changed',
            section: 'professional_summary',
            description: 'Professional Summary: Content text updated',
            details: [],
            text_diff: {
              inline_diff: 'Original text with <span style="background-color: #c8e6c9;">added content</span>',
              word_diff: ['Added: content'],
              old_text: 'Original text',
              new_text: 'Original text with added content',
              stats: {
                additions: 18,
                deletions: 0,
                total_changes: 18
              }
            },
            icon: 'edit',
            color: 'warning'
          }
        ],
        summary: '1 Change',
        total_changes: 1
      }
      
      mockedApi.get.mockResolvedValue({ data: mockDiffResponse })
      
      const result = await historyService.getDiff('cv_123', 'history_target')
      
      expect(result.changes[0].text_diff).toBeDefined()
      expect(result.changes[0].text_diff?.inline_diff).toContain('added content')
      expect(result.changes[0].text_diff?.stats.additions).toBe(18)
    })

    it('should handle diff API errors', async () => {
      mockedApi.get.mockRejectedValue(new Error('404 Not Found'))
      
      await expect(historyService.getDiff('cv_123', 'nonexistent'))
        .rejects.toThrow('Failed to compute diff')
    })
  })

  describe('deleteHistoryEntry', () => {
    it('should delete history entry successfully', async () => {
      mockedApi.delete.mockResolvedValue({ data: { message: 'Entry deleted' } })
      
      await historyService.deleteHistoryEntry('cv_123', 'history_123')
      
      expect(mockedApi.delete).toHaveBeenCalledWith('/api/cvs/cv_123/history/history_123')
    })

    it('should handle deletion errors', async () => {
      mockedApi.delete.mockRejectedValue(new Error('403 Forbidden'))
      
      await expect(historyService.deleteHistoryEntry('cv_123', 'history_123'))
        .rejects.toThrow('Failed to delete history entry')
    })
  })

  describe('getHistoryStats', () => {
    it('should retrieve history statistics successfully', async () => {
      const mockStatsResponse = {
        data: {
          totalEntries: 10,
          autoSnapshots: 7,
          manualSnapshots: 3,
          totalStorageUsed: 1048576,
          oldestEntry: '2024-01-01T00:00:00Z',
          newestEntry: '2024-01-10T00:00:00Z'
        }
      }
      
      mockedApi.get.mockResolvedValue(mockStatsResponse)
      
      const result = await historyService.getHistoryStats('cv_123')
      
      expect(mockedApi.get).toHaveBeenCalledWith('/api/cvs/cv_123/history-stats')
      expect(result.totalEntries).toBe(10)
      expect(result.autoSnapshots).toBe(7)
      expect(result.manualSnapshots).toBe(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed API responses', async () => {
      mockedApi.get.mockResolvedValue({ data: null })
      
      await expect(historyService.getHistory('cv_123'))
        .rejects.toThrow('Failed to fetch history')
    })

    it('should handle network timeouts', async () => {
      mockedApi.post.mockRejectedValue(new Error('TIMEOUT'))
      
      await expect(historyService.createSnapshot('cv_123', mockCVData, {
        changeType: 'manual_save',
        description: 'Test',
        isAutomatic: false,
        label: null
      })).rejects.toThrow('Failed to create history snapshot')
    })
  })
})
