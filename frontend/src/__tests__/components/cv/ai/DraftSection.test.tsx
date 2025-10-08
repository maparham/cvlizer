/**
 * DraftSection Component Tests
 *
 * Tests for AI draft approve/reject functionality including loading states,
 * error handling, and callback execution.
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import DraftSection from '../../../../components/cv/ai/DraftSection'
import * as aiStore from '../../../../stores/aiStore'
import * as uiStore from '../../../../stores/uiStore'

// Mock API service first to avoid import.meta issues
jest.mock('../../../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}))

// Mock the stores
jest.mock('../../../../stores/aiStore')
jest.mock('../../../../stores/uiStore')

// Mock ReactMarkdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="markdown-content">{children}</div>
}))

describe('DraftSection', () => {
  const mockApproveWhyGoodFitDraft = jest.fn()
  const mockDeleteWhyGoodFitDraft = jest.fn()
  const mockShowSuccess = jest.fn()
  const mockShowError = jest.fn()
  const mockOnApprove = jest.fn()
  const mockOnDiscard = jest.fn()

  const sampleDraft = {
    id: 'draft-123',
    section_type: 'why_good_fit',
    content: '## Why I am a good fit\n\nI have extensive experience in software development.',
    status: 'pending',
    created_at: '2024-01-15T10:30:00Z',
    model: 'gpt-4',
    prompt_tokens: 150,
    completion_tokens: 200
  }

  const defaultProps = {
    cvId: 'cv-123',
    draft: sampleDraft,
    onApprove: mockOnApprove,
    onDiscard: mockOnDiscard
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup store mocks
    ;(aiStore.useAIStore as unknown as jest.Mock).mockReturnValue({
      approveWhyGoodFitDraft: mockApproveWhyGoodFitDraft,
      deleteWhyGoodFitDraft: mockDeleteWhyGoodFitDraft
    })

    ;(uiStore.useNotifications as unknown as jest.Mock).mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError
    })

    mockApproveWhyGoodFitDraft.mockResolvedValue(undefined)
    mockDeleteWhyGoodFitDraft.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    test('renders draft content', () => {
      render(<DraftSection {...defaultProps} />)
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })

    test('displays Draft badge', () => {
      render(<DraftSection {...defaultProps} />)
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    test('renders approve button', () => {
      render(<DraftSection {...defaultProps} />)
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    })

    test('renders discard button', () => {
      render(<DraftSection {...defaultProps} />)
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument()
    })

    test('displays draft content in markdown', () => {
      render(<DraftSection {...defaultProps} />)
      const markdownContent = screen.getByTestId('markdown-content')
      expect(markdownContent).toHaveTextContent(/Why I am a good fit/)
    })
  })

  describe('Approve Functionality', () => {
    test('calls approveWhyGoodFitDraft when approve button clicked', async () => {
      const user = userEvent.setup()
      render(<DraftSection {...defaultProps} />)

      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)

      await waitFor(() => {
        expect(mockApproveWhyGoodFitDraft).toHaveBeenCalledWith('cv-123', 'draft-123')
      })
    })

    test('shows success notification on successful approve', async () => {
      const user = userEvent.setup()
      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /approve/i }))

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Draft approved and committed successfully')
      })
    })

    test('calls onApprove callback after successful approve', async () => {
      const user = userEvent.setup()
      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /approve/i }))

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledTimes(1)
      })
    })

    test('shows loading state while approving', async () => {
      const user = userEvent.setup()
      mockApproveWhyGoodFitDraft.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /approve/i }))

      expect(screen.getByRole('button', { name: /approving/i })).toBeDisabled()
    })

    test('disables buttons while approving', async () => {
      const user = userEvent.setup()
      mockApproveWhyGoodFitDraft.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /approve/i }))

      expect(screen.getByRole('button', { name: /approving/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /discard/i })).toBeDisabled()
    })

    test('handles approve error gracefully', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Network error'
      mockApproveWhyGoodFitDraft.mockRejectedValue(new Error(errorMessage))

      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /approve/i }))

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Error', errorMessage)
      })
    })

    test('does not call onApprove callback on error', async () => {
      const user = userEvent.setup()
      mockApproveWhyGoodFitDraft.mockRejectedValue(new Error('Failed'))

      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /approve/i }))

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalled()
      })

      expect(mockOnApprove).not.toHaveBeenCalled()
    })

    test('re-enables buttons after approve error', async () => {
      const user = userEvent.setup()
      mockApproveWhyGoodFitDraft.mockRejectedValue(new Error('Failed'))

      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /approve/i }))

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalled()
      })

      expect(screen.getByRole('button', { name: /approve/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /discard/i })).not.toBeDisabled()
    })
  })

  describe('Discard Functionality', () => {
    test('calls deleteWhyGoodFitDraft when discard button clicked', async () => {
      const user = userEvent.setup()
      render(<DraftSection {...defaultProps} />)

      const discardButton = screen.getByRole('button', { name: /discard/i })
      await user.click(discardButton)

      await waitFor(() => {
        expect(mockDeleteWhyGoodFitDraft).toHaveBeenCalledWith('cv-123')
      })
    })

    test('shows success notification on successful discard', async () => {
      const user = userEvent.setup()
      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /discard/i }))

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Draft discarded successfully')
      })
    })

    test('calls onDiscard callback after successful discard', async () => {
      const user = userEvent.setup()
      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /discard/i }))

      await waitFor(() => {
        expect(mockOnDiscard).toHaveBeenCalledTimes(1)
      })
    })

    test('shows loading state while discarding', async () => {
      const user = userEvent.setup()
      mockDeleteWhyGoodFitDraft.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /discard/i }))

      expect(screen.getByRole('button', { name: /discarding/i })).toBeDisabled()
    })

    test('disables buttons while discarding', async () => {
      const user = userEvent.setup()
      mockDeleteWhyGoodFitDraft.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /discard/i }))

      expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /discarding/i })).toBeDisabled()
    })

    test('handles discard error gracefully', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to delete draft'
      mockDeleteWhyGoodFitDraft.mockRejectedValue(new Error(errorMessage))

      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /discard/i }))

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Error', errorMessage)
      })
    })

    test('does not call onDiscard callback on error', async () => {
      const user = userEvent.setup()
      mockDeleteWhyGoodFitDraft.mockRejectedValue(new Error('Failed'))

      render(<DraftSection {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /discard/i }))

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalled()
      })

      expect(mockOnDiscard).not.toHaveBeenCalled()
    })
  })

  describe('Draft Metadata', () => {
    test('displays creation date', () => {
      render(<DraftSection {...defaultProps} />)
      // Date formatting will show as "Jan 15" or similar
      expect(screen.getByText(/Jan 15/i)).toBeInTheDocument()
    })

    test('displays model information', () => {
      render(<DraftSection {...defaultProps} />)
      expect(screen.getByText(/gpt-4/i)).toBeInTheDocument()
    })

    test('displays token usage in metadata', () => {
      render(<DraftSection {...defaultProps} />)
      expect(screen.getByText(/150.*tokens/i)).toBeInTheDocument()
      expect(screen.getByText(/200.*tokens/i)).toBeInTheDocument()
    })
  })

  describe('Optional Callbacks', () => {
    test('works without onApprove callback', async () => {
      const user = userEvent.setup()
      render(<DraftSection {...defaultProps} onApprove={undefined} />)

      await user.click(screen.getByRole('button', { name: /approve/i }))

      await waitFor(() => {
        expect(mockApproveWhyGoodFitDraft).toHaveBeenCalled()
        expect(mockShowSuccess).toHaveBeenCalled()
      })
    })

    test('works without onDiscard callback', async () => {
      const user = userEvent.setup()
      render(<DraftSection {...defaultProps} onDiscard={undefined} />)

      await user.click(screen.getByRole('button', { name: /discard/i }))

      await waitFor(() => {
        expect(mockDeleteWhyGoodFitDraft).toHaveBeenCalled()
        expect(mockShowSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases', () => {
    test('handles draft with minimal content', () => {
      const minimalDraft = {
        ...sampleDraft,
        content: 'Short content'
      }

      render(<DraftSection {...defaultProps} draft={minimalDraft} />)
      expect(screen.getByText('Short content')).toBeInTheDocument()
    })

    test('handles draft with very long content', () => {
      const longDraft = {
        ...sampleDraft,
        content: 'A'.repeat(5000)
      }

      render(<DraftSection {...defaultProps} draft={longDraft} />)
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })

    test('handles draft without token information', () => {
      const draftWithoutTokens = {
        ...sampleDraft,
        prompt_tokens: undefined,
        completion_tokens: undefined
      }

      render(<DraftSection {...defaultProps} draft={draftWithoutTokens as any} />)
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    })

    test('prevents double-click on approve', async () => {
      const user = userEvent.setup()
      mockApproveWhyGoodFitDraft.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<DraftSection {...defaultProps} />)

      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)
      await user.click(approveButton)

      await waitFor(() => {
        expect(mockApproveWhyGoodFitDraft).toHaveBeenCalledTimes(1)
      })
    })

    test('prevents double-click on discard', async () => {
      const user = userEvent.setup()
      mockDeleteWhyGoodFitDraft.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<DraftSection {...defaultProps} />)

      const discardButton = screen.getByRole('button', { name: /discard/i })
      await user.click(discardButton)
      await user.click(discardButton)

      await waitFor(() => {
        expect(mockDeleteWhyGoodFitDraft).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Accessibility', () => {
    test('approve button has proper aria label', () => {
      render(<DraftSection {...defaultProps} />)
      const approveButton = screen.getByRole('button', { name: /approve/i })
      expect(approveButton).toBeInTheDocument()
    })

    test('discard button has proper aria label', () => {
      render(<DraftSection {...defaultProps} />)
      const discardButton = screen.getByRole('button', { name: /discard/i })
      expect(discardButton).toBeInTheDocument()
    })

    test('buttons are keyboard accessible', () => {
      render(<DraftSection {...defaultProps} />)
      const approveButton = screen.getByRole('button', { name: /approve/i })
      const discardButton = screen.getByRole('button', { name: /discard/i })

      expect(approveButton).not.toHaveAttribute('tabIndex', '-1')
      expect(discardButton).not.toHaveAttribute('tabIndex', '-1')
    })
  })
})
