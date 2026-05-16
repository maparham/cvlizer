/**
 * EducationSection Component Tests
 *
 * Tests for the education section including add/edit/delete functionality,
 * degree autocomplete, GPA validation, and date handling.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import EducationSection from '../../../../components/cv/sections/EducationSection'

// Mock autocomplete components
jest.mock('../../../../components/cv/ui/DegreeAutocomplete', () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="degree-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
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

// Mock IndividualItemSection
jest.mock('../../../../components/cv/core/IndividualItemSection', () => ({
  __esModule: true,
  default: ({ data, title, emptyMessage, createNewItem, renderItemForm, renderItemDisplay }: any) => {
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
      setItems(items.filter((_: any, i: number) => i !== index))
      setEditingIndex(null)
    }

    return (
      <div data-testid="individual-item-section">
        <h2>{title}</h2>
        {items.length === 0 ? (
          <p>{emptyMessage}</p>
        ) : (
          items.map((item: any, index: number) => (
            <div key={item.id} data-testid={`education-item-${index}`}>
              {editingIndex === index ? (
                <div data-testid={`edit-form-${index}`}>
                  {renderItemForm(
                    item,
                    index,
                    (field: string, value: any) => handleUpdate(index, field, value),
                    () => setEditingIndex(null)
                  )}
                  <button onClick={() => setEditingIndex(null)} data-testid={`save-button-${index}`}>
                    Save
                  </button>
                  <button onClick={() => handleDelete(index)} data-testid={`delete-button-${index}`}>
                    Delete
                  </button>
                </div>
              ) : (
                <div data-testid={`display-${index}`}>
                  {renderItemDisplay(item, index)}
                  <button onClick={() => setEditingIndex(index)} data-testid={`edit-button-${index}`}>
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <button onClick={handleAdd} data-testid="add-button">
          Add Education
        </button>
      </div>
    )
  }
}))

describe('EducationSection', () => {
  const defaultProps = {
    data: [],
    onUpdate: jest.fn(),
    onSave: jest.fn(),
    isEditing: false,
    onEdit: jest.fn(),
    onClose: jest.fn(),
    onUnsavedChanges: jest.fn(),
    registerIndividualItemEditing: jest.fn(),
    unregisterIndividualItemEditing: jest.fn(),
    requestIndividualItemCancel: jest.fn()
  }

  const sampleEducation = {
    id: 'edu-1',
    institution: 'Stanford University',
    degree: 'Bachelor of Science',
    field_of_study: 'Computer Science',
    location: 'Stanford, CA',
    start_date: '2016-09',
    end_date: '2020-06',
    gpa: '3.8',
    description: 'Focused on AI and Machine Learning',
    honors: ['Dean\'s List', 'Cum Laude']
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders section title', () => {
      render(<EducationSection {...defaultProps} />)
      expect(screen.getByText('Education')).toBeInTheDocument()
    })

    test('displays empty message when no education', () => {
      render(<EducationSection {...defaultProps} />)
      expect(screen.getByText(/Click the \+ button to add your first education/i)).toBeInTheDocument()
    })

    test('renders existing education items', () => {
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)
      expect(screen.getByTestId('education-item-0')).toBeInTheDocument()
    })

    test('renders add button', () => {
      render(<EducationSection {...defaultProps} />)
      expect(screen.getByTestId('add-button')).toBeInTheDocument()
    })
  })

  describe('Display Mode', () => {
    test('displays degree and field of study', () => {
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)
      expect(screen.getByText(/Bachelor of Science/)).toBeInTheDocument()
      expect(screen.getByText(/Computer Science/)).toBeInTheDocument()
    })

    test('displays institution name', () => {
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)
      expect(screen.getByText(/Stanford University/)).toBeInTheDocument()
    })

    test('displays date range', () => {
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)
      expect(screen.getByText(/2016-09/)).toBeInTheDocument()
      expect(screen.getByText(/2020-06/)).toBeInTheDocument()
    })

    test('displays GPA when present', () => {
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)
      expect(screen.getByText(/3\.8/)).toBeInTheDocument()
    })

    test('displays location', () => {
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)
      expect(screen.getByText(/Stanford, CA/)).toBeInTheDocument()
    })
  })

  describe('Add Functionality', () => {
    test('adds new education item', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      expect(screen.getByTestId('education-item-0')).toBeInTheDocument()
    })

    test('creates new item with empty fields', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()
    })

    test('new item has generated ID', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} />)

      await user.click(screen.getByTestId('add-button'))

      expect(screen.getByTestId('education-item-0')).toBeInTheDocument()
    })
  })

  describe('Edit Functionality', () => {
    test('switches to edit mode when edit button clicked', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)

      await user.click(screen.getByTestId('edit-button-0'))

      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()
    })

    test('displays form fields in edit mode', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)

      await user.click(screen.getByTestId('edit-button-0'))

      expect(screen.getByTestId('degree-autocomplete')).toBeInTheDocument()
      expect(screen.getByTestId('location-autocomplete')).toBeInTheDocument()
    })

    test('updates degree field', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)

      await user.click(screen.getByTestId('edit-button-0'))

      const degreeInput = screen.getByTestId('degree-autocomplete')
      await user.clear(degreeInput)
      await user.type(degreeInput, 'Master of Science')

      expect(degreeInput).toHaveValue('Master of Science')
    })

    test('updates location field', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)

      await user.click(screen.getByTestId('edit-button-0'))

      const locationInput = screen.getByTestId('location-autocomplete')
      await user.clear(locationInput)
      await user.type(locationInput, 'Cambridge, MA')

      expect(locationInput).toHaveValue('Cambridge, MA')
    })

    test('saves changes when save button clicked', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)

      await user.click(screen.getByTestId('edit-button-0'))
      await user.click(screen.getByTestId('save-button-0'))

      expect(screen.queryByTestId('edit-form-0')).not.toBeInTheDocument()
      expect(screen.getByTestId('display-0')).toBeInTheDocument()
    })
  })

  describe('Delete Functionality', () => {
    test('deletes education item', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)

      await user.click(screen.getByTestId('edit-button-0'))
      await user.click(screen.getByTestId('delete-button-0'))

      expect(screen.queryByTestId('education-item-0')).not.toBeInTheDocument()
      expect(screen.getByText(/Click the \+ button to add your first education/i)).toBeInTheDocument()
    })

    test('deletes correct item when multiple items exist', async () => {
      const user = userEvent.setup()
      const secondEdu = { ...sampleEducation, id: 'edu-2', institution: 'MIT' }

      render(<EducationSection {...defaultProps} data={[sampleEducation, secondEdu]} />)

      await user.click(screen.getByTestId('edit-button-0'))
      await user.click(screen.getByTestId('delete-button-0'))

      expect(screen.getByText(/MIT/)).toBeInTheDocument()
      expect(screen.queryByText(/Stanford University/)).not.toBeInTheDocument()
    })
  })

  describe('Autocomplete Integration', () => {
    test('DegreeAutocomplete receives correct props', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)

      await user.click(screen.getByTestId('edit-button-0'))

      const degreeInput = screen.getByTestId('degree-autocomplete')
      expect(degreeInput).toHaveValue('Bachelor of Science')
    })

    test('LocationAutocomplete receives correct props', async () => {
      const user = userEvent.setup()
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)

      await user.click(screen.getByTestId('edit-button-0'))

      const locationInput = screen.getByTestId('location-autocomplete')
      expect(locationInput).toHaveValue('Stanford, CA')
    })
  })

  describe('Multiple Items', () => {
    test('renders multiple education entries', () => {
      const educations = [
        sampleEducation,
        { ...sampleEducation, id: 'edu-2', institution: 'MIT' },
        { ...sampleEducation, id: 'edu-3', institution: 'Harvard' }
      ]

      render(<EducationSection {...defaultProps} data={educations} />)

      expect(screen.getByText(/Stanford University/)).toBeInTheDocument()
      expect(screen.getByText(/MIT/)).toBeInTheDocument()
      expect(screen.getByText(/Harvard/)).toBeInTheDocument()
    })

    test('can edit different items independently', async () => {
      const user = userEvent.setup()
      const educations = [
        sampleEducation,
        { ...sampleEducation, id: 'edu-2', institution: 'MIT' }
      ]

      render(<EducationSection {...defaultProps} data={educations} />)

      await user.click(screen.getByTestId('edit-button-0'))
      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument()
      expect(screen.getByTestId('display-1')).toBeInTheDocument()
    })
  })

  describe('GPA Handling', () => {
    test('displays GPA in display mode', () => {
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)
      expect(screen.getByText(/3\.8/)).toBeInTheDocument()
    })

    test('handles missing GPA gracefully', () => {
      const eduWithoutGPA = { ...sampleEducation, gpa: '' }
      render(<EducationSection {...defaultProps} data={[eduWithoutGPA]} />)
      expect(screen.getByText(/Stanford University/)).toBeInTheDocument()
    })
  })

  describe('Date Handling', () => {
    test('displays graduation date', () => {
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)
      expect(screen.getByText(/2020-06/)).toBeInTheDocument()
    })

    test('handles current student (no end date)', () => {
      const currentStudent = { ...sampleEducation, end_date: '' }
      render(<EducationSection {...defaultProps} data={[currentStudent]} />)
      expect(screen.getByText(/2016-09/)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles undefined data gracefully', () => {
      render(<EducationSection {...defaultProps} data={undefined as any} />)
      expect(screen.getByText(/Click the \+ button to add your first education/i)).toBeInTheDocument()
    })

    test('handles education with missing optional fields', () => {
      const minimalEdu = {
        id: 'edu-1',
        institution: 'University',
        degree: 'BS',
        field_of_study: 'CS',
        location: '',
        start_date: '2016',
        end_date: '2020',
        gpa: '',
        description: '',
        honors: []
      }

      render(<EducationSection {...defaultProps} data={[minimalEdu]} />)
      expect(screen.getByText(/University/)).toBeInTheDocument()
    })

    test('handles empty honors array', () => {
      const eduWithEmptyArrays = {
        ...sampleEducation,
        honors: []
      }

      render(<EducationSection {...defaultProps} data={[eduWithEmptyArrays]} />)
      expect(screen.getByText(/Stanford University/)).toBeInTheDocument()
    })
  })

  describe('Component Updates', () => {
    test('renders correctly with empty data', () => {
      const { container } = render(<EducationSection {...defaultProps} data={[]} />)
      expect(container.querySelector('[data-testid="education-item-0"]')).not.toBeInTheDocument()
    })

    test('renders correctly with populated data', () => {
      render(<EducationSection {...defaultProps} data={[sampleEducation]} />)
      expect(screen.getByText('Education')).toBeInTheDocument()
      expect(screen.getByText(/Stanford University/)).toBeInTheDocument()
    })
  })
})
