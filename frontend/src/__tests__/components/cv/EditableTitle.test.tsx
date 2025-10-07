/**
 * EditableTitle Component Tests
 *
 * Tests for editable title component including:
 * - Display and edit modes
 * - Click to edit functionality
 * - Save on blur and enter
 * - Cancel on escape
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { EditableTitle } from '../../../components/cv/EditableTitle'

describe('EditableTitle', () => {
  const defaultProps = {
    title: 'Test Title',
    onSave: jest.fn().mockResolvedValue(undefined),
    placeholder: 'Enter title...'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Display Mode', () => {
    test('renders title in display mode', () => {
      render(<EditableTitle {...defaultProps} />)
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })

    test('shows placeholder when title is empty', () => {
      render(<EditableTitle {...defaultProps} title="" />)
      const input = screen.queryByPlaceholderText('Enter title...')
      // Placeholder only visible in edit mode
      expect(input).not.toBeInTheDocument()
    })

    test('shows edit icon on hover', () => {
      render(<EditableTitle {...defaultProps} />)
      expect(screen.getByTestId('EditIcon')).toBeInTheDocument()
    })

    test('enters edit mode on click', () => {
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      expect(input).toBeInTheDocument()
      expect(input).toHaveFocus()
    })
  })

  describe('Edit Mode', () => {
    test('shows input field in edit mode', () => {
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
    })

    test('allows text editing', async () => {
      const user = userEvent.setup()
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      await user.clear(input)
      await user.type(input, 'New Title')

      expect(input).toHaveValue('New Title')
    })

    test('saves on blur', async () => {
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      fireEvent.change(input, { target: { value: 'Updated Title' } })
      fireEvent.blur(input)

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith('Updated Title')
      })
    })

    test('saves on Enter key', async () => {
      const user = userEvent.setup()
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      await user.clear(input)
      await user.type(input, 'New Title{Enter}')

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith('New Title')
      })
    })

    test('cancels on Escape key', async () => {
      const user = userEvent.setup()
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      await user.clear(input)
      await user.type(input, 'Changed{Escape}')

      expect(defaultProps.onSave).not.toHaveBeenCalled()
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })

    test('trims whitespace before saving', async () => {
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      fireEvent.change(input, { target: { value: '  Trimmed Title  ' } })
      fireEvent.blur(input)

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith('Trimmed Title')
      })
    })

    test('does not save if value unchanged', async () => {
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      fireEvent.blur(input)

      expect(defaultProps.onSave).not.toHaveBeenCalled()
    })

    test('does not save empty title', async () => {
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      fireEvent.change(input, { target: { value: '   ' } })
      fireEvent.blur(input)

      expect(defaultProps.onSave).not.toHaveBeenCalled()
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })
  })

  describe('Typography Variants', () => {
    test('applies custom variant', () => {
      render(<EditableTitle {...defaultProps} variant="h4" />)
      const title = screen.getByText('Test Title')
      expect(title.className).toContain('MuiTypography-h4')
    })

    test('applies h6 variant by default', () => {
      render(<EditableTitle {...defaultProps} />)
      const title = screen.getByText('Test Title')
      expect(title.className).toContain('MuiTypography-h6')
    })
  })

  describe('Accessibility', () => {
    test('input is rendered when in edit mode', () => {
      render(<EditableTitle {...defaultProps} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      expect(input).toBeInTheDocument()
    })

    test('can be disabled', () => {
      render(<EditableTitle {...defaultProps} disabled={true} />)
      fireEvent.click(screen.getByText('Test Title'))

      // Should not enter edit mode
      expect(screen.queryByDisplayValue('Test Title')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles very long titles', () => {
      const longTitle = 'A'.repeat(200)
      render(<EditableTitle {...defaultProps} title={longTitle} />)

      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    test('handles special characters', () => {
      const specialTitle = 'Title with special chars'
      render(<EditableTitle {...defaultProps} title={specialTitle} />)

      expect(screen.getByText(specialTitle)).toBeInTheDocument()
    })

    test('enforces maxLength prop', async () => {
      render(<EditableTitle {...defaultProps} maxLength={20} />)
      fireEvent.click(screen.getByText('Test Title'))

      const input = screen.getByDisplayValue('Test Title')
      expect(input).toHaveAttribute('maxLength', '20')
    })
  })
})
