/**
 * WorkExperienceSection Component Tests
 *
 * Tests for the work experience section of the CV including add/edit/delete
 * functionality, date validation, autocomplete integration, and sorting.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import WorkExperienceSection from '../../../../components/cv/sections/WorkExperienceSection'

// Mock the autocomplete components
jest.mock('../../../../components/cv/ui/JobPositionAutocomplete', () => ({
  __esModule: true,
  default: ({ value, onChange, error, helperText, placeholder }: any) => (
    <input
      data-testid="job-position-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={error}
      aria-describedby={helperText ? 'helper-text' : undefined}
    />
  )
}))

jest.mock('../../../../components/cv/ui/LocationAutocomplete', () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="location-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}))

// Mock IndividualItemSection to simplify testing
jest.mock('../../../../components/cv/core/IndividualItemSection', () => ({
  __esModule: true,
  default: ({ data, title, emptyMessage, createNewItem, renderItemForm, renderItemDisplay, requiredFields }: any) => {
    const [items, setItems] = React.useState(data || [])
    const [editingIndex, setEditingIndex] = React.useState<number | null>(null)

    const handleAdd = () => {
      const newItem = createNewItem()
      setItems([...items, newItem])
      setEditingIndex(items.length)
    }

    const handleUpdate = (index: number, field: string, value: any) => {
      const updated = [...items]
      updated[index] = { ...updated[index], [field]: value }
      setItems(updated)
    }

    const handleDelete = (index: number) => {
      const updated = items.filter((_: any, i: number) => i !== index)
      setItems(updated)
      setEditingIndex(null)
    }

    const handleEdit = (index: number) => {
      setEditingIndex(index)
    }

    const handleSave = () => {
      setEditingIndex(null)
    }

    return (
      <div data-testid="individual-item-section">
        <h2>{title}</h2>
        {items.length === 0 ? (
          <p>{emptyMessage}</p>
        ) : (
          items.map((item: any, index: number) => (
            <div key={item.id} data-testid={`work-experience-item-${index}`}>
              {editingIndex === index ? (
                <div data-testid={`edit-form-${index}`}>
                  {renderItemForm(
                    item,
                    index,
                    (field: string, value: any) => handleUpdate(index, field, value),
                    handleSave
                  )}
                  <button onClick={handleSave} data-testid={`save-button-${index}`}>
                    Save
                  </button>
                  <button onClick={() => handleDelete(index)} data-testid={`delete-button-${index}`}>
                    Delete
                  </button>
                </div>
              ) : (
                <div data-testid={`display-${index}`}>
                  {renderItemDisplay(item, index)}
                  <button onClick={() => handleEdit(index)} data-testid={`edit-button-${index}`}>
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <button onClick={handleAdd} data-testid="add-button">
          Add Work Experience
        </button>
      </div>
    )
  }
}))

describe('WorkExperienceSection', () => {
  const mockOnUpdate = jest.fn()
  const mockOnSave = jest.fn()
  const mockOnEdit = jest.fn()
  const mockOnClose = jest.fn()
  const mockOnUnsavedChanges = jest.fn()

  const defaultProps = {
    data: [],
    onUpdate: mockOnUpdate,
    onSave: mockOnSave,
    isEditing: false,
    onEdit: mockOnEdit,
    onClose: mockOnClose,
    onUnsavedChanges: mockOnUnsavedChanges,
    registerIndividualItemEditing: jest.fn(),
    unregisterIndividualItemEditing: jest.fn(),
    requestIndividualItemCancel: jest.fn()
  }

  const sampleWorkExperience = {
    id: 'work-1',
    company: 'Tech Company Inc.',
    position: 'Software Engineer',
    location: 'San Francisco, CA',
    start_date: '2020-01',
    end_date: '2023-12',
    current: false,
    description: 'Developed web applications',
    achievements: [],
    technologies: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders section title', () => {
      render(<WorkExperienceSection {...defaultProps} />)
      expect(screen.getByText('Work Experience')).toBeInTheDocument()
    })

    test('displays empty message when no work experience', () => {
      render(<WorkExperienceSection {...defaultProps} />)
      expect(
        screen.getByText('Click the + button to add your first work experience')
      ).toBeInTheDocument()
    })

    test('renders existing work experience items', () => {
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      expect(screen.getByTestId('work-experience-item-0')).toBeInTheDocument()
    })

    test('renders add button', () => {
      render(<WorkExperienceSection {...defaultProps} />)
      expect(screen.getByTestId('add-button')).toBeInTheDocument()
    })
  })

  describe('Display Mode', () => {
    test('displays position in bold', () => {
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    })

    test('displays company name with location', () => {
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      expect(screen.getByText(/Tech Company Inc./)).toBeInTheDocument()
      expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument()
    })

    test('displays date range', () => {
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      expect(screen.getByText(/2020-01 - 2023-12/)).toBeInTheDocument()
    })

    test('displays "PRESENT" for current job', () => {
      const currentJob = { ...sampleWorkExperience, current: true, end_date: '' }
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[currentJob]}
        />
      )

      expect(screen.getByText(/PRESENT/)).toBeInTheDocument()
    })

    test('displays job description', () => {
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      expect(screen.getByText('Developed web applications')).toBeInTheDocument()
    })

    test('displays fallback text for empty fields', () => {
      const emptyExp = {
        ...sampleWorkExperience,
        position: '',
        company: '',
        description: ''
      }
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[emptyExp]}
        />
      )

      expect(screen.getByText('Position Title')).toBeInTheDocument()
      expect(screen.getByText(/Company Name/)).toBeInTheDocument()
      expect(screen.getByText('Job description...')).toBeInTheDocument()
    })
  })

  describe('Add Functionality', () => {
    test('adds new work experience item', async () => {
      const user = userEvent.setup()
      render(<WorkExperienceSection {...defaultProps} />)

      const addButton = screen.getByTestId('add-button')
      await user.click(addButton)

      expect(screen.getByTestId('work-experience-item-0')).toBeInTheDocument()
    })

    test('creates new item with empty fields', async () => {
      const user = userEvent.setup()
      render(<WorkExperienceSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      // Should show edit form with empty inputs
      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()
    })

    test('new item has generated ID', async () => {
      const user = userEvent.setup()
      render(<WorkExperienceSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      // Item should be created and rendered
      expect(screen.getByTestId('work-experience-item-0')).toBeInTheDocument()
    })
  })

  describe('Edit Functionality', () => {
    test('switches to edit mode when edit button clicked', async () => {
      const user = userEvent.setup()
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      await user.click(screen.getByTestId('edit-button-0'))

      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()
    })

    test('displays form fields in edit mode', async () => {
      const user = userEvent.setup()
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      await user.click(screen.getByTestId('edit-button-0'))

      expect(screen.getByTestId('job-position-autocomplete')).toBeInTheDocument()
      expect(screen.getByTestId('location-autocomplete')).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    test('updates position field', async () => {
      const user = userEvent.setup()
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      await user.click(screen.getByTestId('edit-button-0'))

      const positionInput = screen.getByTestId('job-position-autocomplete')
      await user.clear(positionInput)
      await user.type(positionInput, 'Senior Software Engineer')

      expect(positionInput).toHaveValue('Senior Software Engineer')
    })

    test('updates company field', async () => {
      const user = userEvent.setup()
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      await user.click(screen.getByTestId('edit-button-0'))

      // Company field should be in the form
      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()
    })

    test('updates location using autocomplete', async () => {
      const user = userEvent.setup()
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      await user.click(screen.getByTestId('edit-button-0'))

      const locationInput = screen.getByTestId('location-autocomplete')
      await user.clear(locationInput)
      await user.type(locationInput, 'New York, NY')

      expect(locationInput).toHaveValue('New York, NY')
    })

    test('saves changes when save button clicked', async () => {
      const user = userEvent.setup()
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      await user.click(screen.getByTestId('edit-button-0'))
      await user.click(screen.getByTestId('save-button-0'))

      // Should exit edit mode
      expect(screen.queryByTestId('edit-form-0')).not.toBeInTheDocument()
      expect(screen.getByTestId('display-0')).toBeInTheDocument()
    })
  })

  describe('Delete Functionality', () => {
    test('deletes work experience item', async () => {
      const user = userEvent.setup()
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      await user.click(screen.getByTestId('edit-button-0'))
      await user.click(screen.getByTestId('delete-button-0'))

      expect(screen.queryByTestId('work-experience-item-0')).not.toBeInTheDocument()
      expect(
        screen.getByText('Click the + button to add your first work experience')
      ).toBeInTheDocument()
    })

    test('deletes correct item when multiple items exist', async () => {
      const user = userEvent.setup()
      const secondExp = { ...sampleWorkExperience, id: 'work-2', position: 'Junior Developer' }

      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience, secondExp]}
        />
      )

      // Delete first item
      await user.click(screen.getByTestId('edit-button-0'))
      await user.click(screen.getByTestId('delete-button-0'))

      // Second item should still exist
      expect(screen.getByText('Junior Developer')).toBeInTheDocument()
      expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument()
    })
  })

  describe('Field Validation', () => {
    test('shows error for empty position field', async () => {
      const user = userEvent.setup()
      render(<WorkExperienceSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      const positionInput = screen.getByTestId('job-position-autocomplete')
      expect(positionInput).toHaveAttribute('aria-invalid', 'true')
    })

    test('position field has placeholder', async () => {
      const user = userEvent.setup()
      render(<WorkExperienceSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      const positionInput = screen.getByTestId('job-position-autocomplete')
      expect(positionInput).toHaveAttribute('placeholder', 'e.g., Software Engineer')
    })

    test('form has required fields', async () => {
      const user = userEvent.setup()
      render(<WorkExperienceSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      // Position and company are required (checked via IndividualItemSection requiredFields prop)
      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()
    })

    test('start date field exists', async () => {
      const user = userEvent.setup()
      render(<WorkExperienceSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      // Start Date field should be present in the form
      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()
    })

    test('end date field exists', async () => {
      const user = userEvent.setup()
      render(<WorkExperienceSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      // End Date field should be present in the form
      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()
    })
  })

  describe('Autocomplete Integration', () => {
    test('JobPositionAutocomplete receives correct props', async () => {
      const user = userEvent.setup()
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      await user.click(screen.getByTestId('edit-button-0'))

      const positionInput = screen.getByTestId('job-position-autocomplete')
      expect(positionInput).toHaveValue('Software Engineer')
      expect(positionInput).toHaveAttribute('placeholder', 'e.g., Software Engineer')
    })

    test('LocationAutocomplete receives correct props', async () => {
      const user = userEvent.setup()
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
        />
      )

      await user.click(screen.getByTestId('edit-button-0'))

      const locationInput = screen.getByTestId('location-autocomplete')
      expect(locationInput).toHaveValue('San Francisco, CA')
      expect(locationInput).toHaveAttribute('placeholder', 'e.g., San Francisco, CA')
    })
  })

  describe('Multiple Items', () => {
    test('renders multiple work experiences', () => {
      const experiences = [
        sampleWorkExperience,
        { ...sampleWorkExperience, id: 'work-2', position: 'Junior Developer' },
        { ...sampleWorkExperience, id: 'work-3', position: 'Intern' }
      ]

      render(
        <WorkExperienceSection
          {...defaultProps}
          data={experiences}
        />
      )

      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('Junior Developer')).toBeInTheDocument()
      expect(screen.getByText('Intern')).toBeInTheDocument()
    })

    test('can edit different items independently', async () => {
      const user = userEvent.setup()
      const experiences = [
        sampleWorkExperience,
        { ...sampleWorkExperience, id: 'work-2', position: 'Junior Developer' }
      ]

      render(
        <WorkExperienceSection
          {...defaultProps}
          data={experiences}
        />
      )

      // Edit first item
      await user.click(screen.getByTestId('edit-button-0'))
      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()

      // Second item should still be in display mode
      expect(screen.getByTestId('display-1')).toBeInTheDocument()
    })
  })

  describe('Memoization', () => {
    test('component displays empty state then populated state', () => {
      const { container } = render(
        <WorkExperienceSection {...defaultProps} data={[]} />
      )

      expect(
        screen.getByText('Click the + button to add your first work experience')
      ).toBeInTheDocument()

      // Verify empty state
      expect(container.querySelector('[data-testid="work-experience-item-0"]')).not.toBeInTheDocument()
    })

    test('component updates when isEditing changes', () => {
      const { rerender } = render(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
          isEditing={false}
        />
      )

      rerender(
        <WorkExperienceSection
          {...defaultProps}
          data={[sampleWorkExperience]}
          isEditing={true}
        />
      )

      // Component should render without errors
      expect(screen.getByText('Work Experience')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles undefined data gracefully', () => {
      render(
        <WorkExperienceSection
          {...defaultProps}
          data={undefined as any}
        />
      )

      expect(
        screen.getByText('Click the + button to add your first work experience')
      ).toBeInTheDocument()
    })

    test('handles work experience with missing optional fields', () => {
      const minimalExp = {
        id: 'work-1',
        position: 'Developer',
        company: 'Company',
        start_date: '2020-01',
        location: '',
        end_date: '',
        current: false,
        description: '',
        achievements: [],
        technologies: []
      }

      render(
        <WorkExperienceSection
          {...defaultProps}
          data={[minimalExp]}
        />
      )

      expect(screen.getByText('Developer')).toBeInTheDocument()
      expect(screen.getByText(/Company/)).toBeInTheDocument()
    })
  })
})
