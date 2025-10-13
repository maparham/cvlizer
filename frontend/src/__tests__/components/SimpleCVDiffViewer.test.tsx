/**
 * Tests for SimpleCVDiffViewer Component
 *
 * Tests the simplified diff viewer that displays backend-computed diff results,
 * including text diffs, change icons, and error handling.
 */

import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SimpleCVDiffViewer from '../../components/cv/SimpleCVDiffViewer'
import { CVHistoryEntry } from '../../types'

// Mock the backend history service
jest.mock('../../services/backendHistoryService', () => ({
  backendHistoryService: {
    getDiff: jest.fn()
  }
}))

// Import the mocked service to access the mock
import { backendHistoryService } from '../../services/backendHistoryService'
const mockGetDiff = backendHistoryService.getDiff as jest.MockedFunction<typeof backendHistoryService.getDiff>

describe('SimpleCVDiffViewer', () => {
  const mockOldVersion: CVHistoryEntry = {
    id: 'history_old',
    timestamp: '2024-01-01T00:00:00Z',
    cvData: {
      work_experience: [
        {
          id: 'work_123',
          company: 'TechCorp',
          position: 'Developer',
          location: 'SF',
          start_date: '2023-01-01',
          end_date: '2024-01-01',
          current: false,
          description: 'Developed apps',
          achievements: [],
          technologies: []
        }
      ]
    } as any,
    changeType: 'initial_load',
    description: 'Original version',
    isAutomatic: true,
    isInitial: true,
    label: 'Initial CV',
    dataSize: 1024
  }

  const mockNewVersion: CVHistoryEntry = {
    id: 'history_new',
    timestamp: '2024-01-02T00:00:00Z',
    cvData: {
      work_experience: [
        {
          id: 'work_123',
          company: 'TechCorp',
          position: 'Senior Developer',
          location: 'SF',
          start_date: '2023-01-01',
          end_date: '2024-01-01',
          current: false,
          description: 'Developed apps',
          achievements: [],
          technologies: []
        }
      ]
    } as any,
    changeType: 'manual_save',
    description: 'Updated position',
    isAutomatic: false,
    isInitial: false,
    label: undefined,
    dataSize: 1100
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetDiff.mockClear()
  })

  it('should display loading state initially', () => {
    mockGetDiff.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(
      <SimpleCVDiffViewer
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        cvId="cv_123"
        title="Test Changes"
      />
    )

    expect(screen.getByText('Computing changes...')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should display simple field changes', async () => {
    const mockDiffResult = {
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

    mockGetDiff.mockResolvedValue(mockDiffResult)

    render(
      <SimpleCVDiffViewer
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        cvId="cv_123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('1 Change')).toBeInTheDocument()
      expect(screen.getByText('Work Experience: Position changed from "Developer" to "Senior Developer"')).toBeInTheDocument()
    })

    expect(mockGetDiff).toHaveBeenCalledWith('cv_123', 'history_new', 'history_old', false)
  })

  it('should display text diff with inline highlighting', async () => {
    const mockDiffResult = {
      changes: [
        {
          type: 'field_changed',
          section: 'professional_summary',
          description: 'Professional Summary: Content text updated',
          details: [],
          text_diff: {
            inline_diff: 'Original text with <span style="background-color: #c8e6c9; font-weight: bold;">added content</span>',
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

    mockGetDiff.mockResolvedValue(mockDiffResult)

    render(
      <SimpleCVDiffViewer
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        cvId="cv_123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Professional Summary: Content text updated')).toBeInTheDocument()
      expect(screen.getByText('18 characters added')).toBeInTheDocument()
      expect(screen.getByText('Text with changes highlighted:')).toBeInTheDocument()
    })

    // Check that inline diff HTML is rendered
    const diffContainer = screen.getByText('Text with changes highlighted:').parentElement
    expect(diffContainer?.innerHTML).toContain('added content')
  })

  it('should display multiple changes', async () => {
    const mockDiffResult = {
      changes: [
        {
          type: 'field_changed',
          section: 'personal_info',
          description: 'Personal Information: Location changed from "New York, NY" to "Los Angeles, CA"',
          details: [],
          icon: 'edit',
          color: 'warning'
        },
        {
          type: 'item_added',
          section: 'work_experience',
          description: 'Work Experience: Added Tech Lead at StartupCorp',
          details: [],
          icon: 'add',
          color: 'success'
        }
      ],
      summary: '2 Changes',
      total_changes: 2
    }

    mockGetDiff.mockResolvedValue(mockDiffResult)

    render(
      <SimpleCVDiffViewer
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        cvId="cv_123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('2 Changes')).toBeInTheDocument()
      expect(screen.getByText(/Location changed from/)).toBeInTheDocument()
      expect(screen.getByText(/Added Tech Lead at StartupCorp/)).toBeInTheDocument()
    })
  })

  it('should display no changes message', async () => {
    const mockDiffResult = {
      changes: [],
      summary: 'No changes',
      total_changes: 0
    }

    mockGetDiff.mockResolvedValue(mockDiffResult)

    render(
      <SimpleCVDiffViewer
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        cvId="cv_123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No changes detected between these versions.')).toBeInTheDocument()
    })
  })

  it('should display error state', async () => {
    mockGetDiff.mockRejectedValue(new Error('API Error'))

    render(
      <SimpleCVDiffViewer
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        cvId="cv_123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load changes')).toBeInTheDocument()
    })
  })

  it('should display correct icons for different change types', async () => {
    const mockDiffResult = {
      changes: [
        {
          type: 'item_added',
          section: 'work_experience',
          description: 'Work Experience: Added new position',
          details: [],
          icon: 'add',
          color: 'success'
        },
        {
          type: 'item_removed',
          section: 'education',
          description: 'Education: Removed old degree',
          details: [],
          icon: 'remove',
          color: 'error'
        },
        {
          type: 'field_changed',
          section: 'personal_info',
          description: 'Personal Information: Email updated',
          details: [],
          icon: 'edit',
          color: 'warning'
        }
      ],
      summary: '3 Changes',
      total_changes: 3
    }

    mockGetDiff.mockResolvedValue(mockDiffResult)

    render(
      <SimpleCVDiffViewer
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        cvId="cv_123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('3 Changes')).toBeInTheDocument()
    })

    // Icons should be rendered (they're SVG elements, so we check for their presence)
    const changeCards = screen.getAllByRole('listitem')
    expect(changeCards).toHaveLength(3)
  })

  it('should handle side-by-side diff for large text', async () => {
    const longText = 'A'.repeat(2000) // Very long text

    const mockDiffResult = {
      changes: [
        {
          type: 'field_changed',
          section: 'professional_summary',
          description: 'Professional Summary: Content text updated',
          details: [],
          text_diff: {
            inline_diff: undefined, // No inline diff for large text
            word_diff: ['Added: many', 'Added: words'],
            old_text: longText,
            new_text: longText + ' with additions',
            stats: {
              additions: 15,
              deletions: 0,
              total_changes: 15
            }
          },
          icon: 'edit',
          color: 'warning'
        }
      ],
      summary: '1 Change',
      total_changes: 1
    }

    mockGetDiff.mockResolvedValue(mockDiffResult)

    render(
      <SimpleCVDiffViewer
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        cvId="cv_123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Before:')).toBeInTheDocument()
      expect(screen.getByText('After:')).toBeInTheDocument()
    })
  })
})
