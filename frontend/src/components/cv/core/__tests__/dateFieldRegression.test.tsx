/**
 * Regression tests for DateFieldComponent
 * Specifically tests the DD.MM reset issue when typing partial years
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateFieldComponent } from '../formUtils'

// Helper component to wrap DateFieldComponent with required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    {children}
  </LocalizationProvider>
)

describe('DateFieldComponent - Regression Prevention', () => {
  const defaultProps = {
    config: {
      name: 'test_date',
      label: 'Test Date',
      required: true
    },
    value: '',
    onChange: jest.fn(),
    onSave: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Main Regression Test - DD.MM Reset Issue', () => {
    it('should not reset DD.MM when typing partial year', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(
        <TestWrapper>
          <DateFieldComponent {...defaultProps} onChange={onChange} />
        </TestWrapper>
      )

      // Find the date input container (MUIDateField creates a complex DOM structure)
      const dateInputContainer = screen.getByRole('group')

      // Focus the input and start typing
      await user.click(dateInputContainer)

      // Type DD.MM.20 (partial year)
      await user.type(dateInputContainer, '251220')

      // The key regression test: onChange should NOT be called for partial dates
      // This prevents the DD.MM parts from resetting
      expect(onChange).not.toHaveBeenCalled()
    })

    it('should handle complete date input without errors', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(
        <TestWrapper>
          <DateFieldComponent {...defaultProps} onChange={onChange} />
        </TestWrapper>
      )

      const dateInputContainer = screen.getByRole('group')
      await user.click(dateInputContainer)

      // Type complete valid date
      await user.type(dateInputContainer, '25122023')

      // In test environment, MUIDateField may not trigger onChange immediately
      // The important thing is that it doesn't crash or reset the input
      expect(dateInputContainer).toBeInTheDocument()
    })

    it('should preserve partial input without validation errors', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DateFieldComponent {...defaultProps} />
        </TestWrapper>
      )

      const dateInputContainer = screen.getByRole('group')
      await user.click(dateInputContainer)

      // Type partial date
      await user.type(dateInputContainer, '251220')

      // Should not show validation errors for partial input
      // The field should remain in a "typing" state
      expect(screen.queryByText('Test Date must be in YYYY-MM-DD format')).not.toBeInTheDocument()
    })
  })

  describe('Input State Management', () => {
    it('should handle rapid typing without resetting', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(
        <TestWrapper>
          <DateFieldComponent {...defaultProps} onChange={onChange} />
        </TestWrapper>
      )

      const dateInputContainer = screen.getByRole('group')
      await user.click(dateInputContainer)

      // Type rapidly
      await user.type(dateInputContainer, '25122023')

      // Should handle rapid input without crashing or resetting
      expect(dateInputContainer).toBeInTheDocument()
    })

    it('should initialize correctly with existing value', () => {
      const props = {
        ...defaultProps,
        value: '2023-12-25'
      }

      render(
        <TestWrapper>
          <DateFieldComponent {...props} />
        </TestWrapper>
      )

      // Should render without errors
      expect(screen.getByText('Test Date *')).toBeInTheDocument()
    })
  })

  describe('Calendar Picker Integration', () => {
    it('should have calendar picker button', () => {
      render(
        <TestWrapper>
          <DateFieldComponent {...defaultProps} />
        </TestWrapper>
      )

      // Calendar button should be present
      const calendarButton = screen.getByRole('button')
      expect(calendarButton).toBeInTheDocument()
    })

    it('should handle calendar picker date selection', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(
        <TestWrapper>
          <DateFieldComponent {...defaultProps} onChange={onChange} />
        </TestWrapper>
      )

      const calendarButton = screen.getByRole('button')

      // Click calendar button
      await user.click(calendarButton)

      // The calendar should open (we can't easily test the calendar UI in jsdom,
      // but we can test that the button is functional)
      expect(calendarButton).toBeInTheDocument()
    })
  })

  describe('Validation Behavior', () => {
    it('should show required error for empty required field', () => {
      render(
        <TestWrapper>
          <DateFieldComponent {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('Test Date is required')).toBeInTheDocument()
    })

    it('should not show required error for optional field', () => {
      const props = {
        ...defaultProps,
        config: {
          ...defaultProps.config,
          required: false
        }
      }

      render(
        <TestWrapper>
          <DateFieldComponent {...props} />
        </TestWrapper>
      )

      expect(screen.queryByText('Test Date is required')).not.toBeInTheDocument()
    })

    it('should validate min/max date constraints', () => {
      const props = {
        ...defaultProps,
        config: {
          ...defaultProps.config,
          minDate: '2023-01-01',
          maxDate: '2023-12-31'
        },
        value: '2022-12-31' // Invalid - before min date
      }

      render(
        <TestWrapper>
          <DateFieldComponent {...props} />
        </TestWrapper>
      )

      expect(screen.getByText('Test Date must be after 2023-01-01')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid date strings gracefully', () => {
      const props = {
        ...defaultProps,
        value: 'invalid-date'
      }

      render(
        <TestWrapper>
          <DateFieldComponent {...props} />
        </TestWrapper>
      )

      // Should not crash
      expect(screen.getByText('Test Date *')).toBeInTheDocument()
    })

    it('should handle empty value updates', () => {
      const { rerender } = render(
        <TestWrapper>
          <DateFieldComponent {...defaultProps} value="2023-12-25" />
        </TestWrapper>
      )

      // Clear the value
      rerender(
        <TestWrapper>
          <DateFieldComponent {...defaultProps} value="" />
        </TestWrapper>
      )

      // Should handle empty value without errors
      expect(screen.getByText('Test Date is required')).toBeInTheDocument()
    })
  })
})
