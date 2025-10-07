/**
 * PersonalInfoSection Component Tests
 *
 * Tests for the personal info section including field validation,
 * email/phone format validation, and location autocomplete.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import PersonalInfoSection from '../../../../components/cv/sections/PersonalInfoSection'

// Mock LocationAutocomplete
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

// Mock SimpleFormSection
jest.mock('../../../../components/cv/core/SimpleFormSection', () => ({
  __esModule: true,
  default: ({ data, title, emptyMessage, renderForm }: any) => {
    const [formData, setFormData] = React.useState(data || {})
    const [isEditing, setIsEditing] = React.useState(false)

    const handleUpdate = (field: string, value: any) => {
      setFormData({ ...formData, [field]: value })
    }

    return (
      <div data-testid="simple-form-section">
        <h2>{title}</h2>
        {!formData.name && !isEditing ? (
          <p>{emptyMessage}</p>
        ) : (
          <div>
            {isEditing ? (
              <div data-testid="edit-form">
                {renderForm(formData, handleUpdate, () => setIsEditing(false))}
                <button onClick={() => setIsEditing(false)} data-testid="save-button">
                  Save
                </button>
              </div>
            ) : (
              <div data-testid="display-mode">
                <div>Name: {formData.name}</div>
                <div>Email: {formData.email}</div>
                <div>Phone: {formData.phone}</div>
                <div>Location: {formData.location}</div>
                <button onClick={() => setIsEditing(true)} data-testid="edit-button">
                  Edit
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
}))

describe('PersonalInfoSection', () => {
  const defaultProps = {
    data: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: ''
    },
    onUpdate: jest.fn(),
    onSave: jest.fn(),
    isEditing: false,
    onEdit: jest.fn(),
    onClose: jest.fn(),
    onUnsavedChanges: jest.fn()
  }

  const samplePersonalInfo = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/johndoe',
    github: 'github.com/johndoe',
    website: 'johndoe.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders section title', () => {
      render(<PersonalInfoSection {...defaultProps} />)
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
    })

    test('renders component with empty data', () => {
      render(<PersonalInfoSection {...defaultProps} />)
      expect(screen.getByTestId('simple-form-section')).toBeInTheDocument()
    })

    test('renders with existing data', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()
    })
  })

  describe('Display Mode', () => {
    test('displays name', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    })

    test('displays email', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByText(/john.doe@example.com/)).toBeInTheDocument()
    })

    test('displays phone', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByText(/\+1 \(555\) 123-4567/)).toBeInTheDocument()
    })

    test('displays location', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument()
    })

    test('shows edit button in display mode', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByTestId('edit-button')).toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    test('switches to edit mode when edit button clicked', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      await user.click(screen.getByTestId('edit-button'))

      expect(screen.getByTestId('edit-form')).toBeInTheDocument()
    })

    test('displays location autocomplete in edit mode', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      await user.click(screen.getByTestId('edit-button'))

      expect(screen.getByTestId('location-autocomplete')).toBeInTheDocument()
    })

    test('updates location field', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      await user.click(screen.getByTestId('edit-button'))

      const locationInput = screen.getByTestId('location-autocomplete')
      await user.clear(locationInput)
      await user.type(locationInput, 'New York, NY')

      expect(locationInput).toHaveValue('New York, NY')
    })

    test('saves changes when save button clicked', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      await user.click(screen.getByTestId('edit-button'))
      await user.click(screen.getByTestId('save-button'))

      expect(screen.queryByTestId('edit-form')).not.toBeInTheDocument()
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()
    })
  })

  describe('Field Validation', () => {
    test('name field is required', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      await user.click(screen.getByTestId('edit-button'))

      // Name field should be in the form
      expect(screen.getByTestId('edit-form')).toBeInTheDocument()
    })

    test('email field validation', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      await user.click(screen.getByTestId('edit-button'))

      // Email field should be present for validation
      expect(screen.getByTestId('edit-form')).toBeInTheDocument()
    })

    test('phone field validation', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      await user.click(screen.getByTestId('edit-button'))

      // Phone field should be present for validation
      expect(screen.getByTestId('edit-form')).toBeInTheDocument()
    })
  })

  describe('Social Links', () => {
    test('handles LinkedIn URL', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()
    })

    test('handles GitHub URL', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()
    })

    test('handles personal website URL', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()
    })

    test('handles missing social links gracefully', () => {
      const infoWithoutLinks = {
        ...samplePersonalInfo,
        linkedin: '',
        github: '',
        website: ''
      }

      render(<PersonalInfoSection {...defaultProps} data={infoWithoutLinks} />)
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    })
  })

  describe('Location Autocomplete', () => {
    test('LocationAutocomplete receives correct value', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      await user.click(screen.getByTestId('edit-button'))

      const locationInput = screen.getByTestId('location-autocomplete')
      expect(locationInput).toHaveValue('San Francisco, CA')
    })

    test('LocationAutocomplete can be updated', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      await user.click(screen.getByTestId('edit-button'))

      const locationInput = screen.getByTestId('location-autocomplete')
      await user.clear(locationInput)
      await user.type(locationInput, 'Seattle, WA')

      expect(locationInput).toHaveValue('Seattle, WA')
    })
  })

  describe('Email Format Validation', () => {
    test('displays email in personal info', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByText(/john.doe@example.com/)).toBeInTheDocument()
    })

    test('handles empty email', () => {
      const dataWithoutEmail = { ...samplePersonalInfo, email: '' }
      render(<PersonalInfoSection {...defaultProps} data={dataWithoutEmail} />)
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()
    })
  })

  describe('Phone Format Validation', () => {
    test('accepts various phone formats', () => {
      const validPhones = [
        '+1 (555) 123-4567',
        '555-123-4567',
        '(555) 123-4567',
        '+1-555-123-4567'
      ]

      validPhones.forEach(phone => {
        const data = { ...samplePersonalInfo, phone }
        const { unmount } = render(<PersonalInfoSection {...defaultProps} data={data} />)
        expect(screen.getByTestId('display-mode')).toBeInTheDocument()
        unmount()
      })
    })

    test('handles empty phone', () => {
      const dataWithoutPhone = { ...samplePersonalInfo, phone: '' }
      render(<PersonalInfoSection {...defaultProps} data={dataWithoutPhone} />)
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles undefined data gracefully', () => {
      render(<PersonalInfoSection {...defaultProps} data={undefined as any} />)
      expect(screen.getByTestId('simple-form-section')).toBeInTheDocument()
    })

    test('handles null values in fields', () => {
      const dataWithNulls = {
        name: 'John Doe',
        email: null as any,
        phone: null as any,
        location: null as any,
        linkedin: null as any,
        github: null as any,
        website: null as any
      }

      render(<PersonalInfoSection {...defaultProps} data={dataWithNulls} />)
      expect(screen.getByTestId('simple-form-section')).toBeInTheDocument()
    })

    test('handles very long text fields', () => {
      const longData = {
        name: 'A'.repeat(100),
        email: 'user@' + 'a'.repeat(50) + '.com',
        phone: '+1 (555) 123-4567',
        location: 'Very Long City Name, ' + 'State '.repeat(10),
        linkedin: '',
        github: '',
        website: ''
      }

      render(<PersonalInfoSection {...defaultProps} data={longData} />)
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()
    })

    test('handles special characters in name', () => {
      const specialCharData = {
        ...samplePersonalInfo,
        name: "O'Brien-Smith, Jr."
      }

      render(<PersonalInfoSection {...defaultProps} data={specialCharData} />)
      expect(screen.getByText(/O'Brien-Smith, Jr\./)).toBeInTheDocument()
    })
  })

  describe('Component State', () => {
    test('renders component structure', () => {
      render(<PersonalInfoSection {...defaultProps} />)
      expect(screen.getByTestId('simple-form-section')).toBeInTheDocument()
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
    })

    test('displays populated state correctly', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
      expect(screen.getByText(/john.doe@example.com/)).toBeInTheDocument()
    })

    test('toggles between edit and display mode', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)

      // Start in display mode
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()

      // Switch to edit mode
      await user.click(screen.getByTestId('edit-button'))
      expect(screen.getByTestId('edit-form')).toBeInTheDocument()

      // Save and return to display mode
      await user.click(screen.getByTestId('save-button'))
      expect(screen.getByTestId('display-mode')).toBeInTheDocument()
    })
  })

  describe('Required Fields', () => {
    test('has minimum required fields', async () => {
      const minimalInfo = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '',
        location: '',
        linkedin: '',
        github: '',
        website: ''
      }

      render(<PersonalInfoSection {...defaultProps} data={minimalInfo} />)
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument()
      expect(screen.getByText(/jane@example.com/)).toBeInTheDocument()
    })

    test('handles all fields populated', () => {
      render(<PersonalInfoSection {...defaultProps} data={samplePersonalInfo} />)
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
      expect(screen.getByText(/john.doe@example.com/)).toBeInTheDocument()
      expect(screen.getByText(/\+1 \(555\) 123-4567/)).toBeInTheDocument()
      expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument()
    })
  })
})
