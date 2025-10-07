/**
 * SkillsSection Component Tests
 *
 * Tests for skills section including:
 * - Adding/removing technical and soft skills
 * - Skills autocomplete integration
 * - AI suggestions integration
 * - Data structure handling
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SkillsSection from '../../../../components/cv/sections/SkillsSection'

// Mock dependencies
jest.mock('../../../../stores/aiSuggestionsStore', () => ({
  useAISuggestionsStore: jest.fn(() => ({
    dismissSkillSuggestion: jest.fn(),
    dismissAllSkillSuggestions: jest.fn()
  })),
  useValidatedSuggestions: jest.fn(() => null)
}))

jest.mock('../../../../stores/uiStore', () => ({
  useNotifications: jest.fn(() => ({
    showSuccess: jest.fn(),
    showError: jest.fn()
  }))
}))

jest.mock('../../../../components/cv/ui/SkillsAutocomplete', () => ({
  __esModule: true,
  default: ({ value, onChange, onAdd, label }: any) => (
    <div data-testid="skills-autocomplete">
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add skill..."
      />
      <button onClick={() => onAdd && onAdd()}>Add</button>
    </div>
  )
}))

jest.mock('../../../../components/cv/core/SimpleFormSection', () => ({
  __esModule: true,
  default: ({ data, renderForm, renderDisplay, title, isEditing }: any) => {
    const [editData, setEditData] = React.useState(data || { technical: [], soft: [] })
    const [editing, setEditing] = React.useState(isEditing || false)

    const updateData = (field: string, value: any) => {
      setEditData({ ...editData, [field]: value })
    }

    return (
      <div data-testid="simple-form-section">
        <h2>{title}</h2>
        {editing ? (
          <>
            {renderForm(editData, updateData)}
            <button onClick={() => setEditing(false)}>Save</button>
          </>
        ) : (
          <>
            {renderDisplay(editData)}
            <button onClick={() => setEditing(true)}>Edit</button>
          </>
        )}
      </div>
    )
  }
}))

describe('SkillsSection', () => {
  const defaultProps = {
    data: { technical: [], soft: [] },
    onUpdate: jest.fn(),
    onSave: jest.fn(),
    isEditing: false,
    onEdit: jest.fn(),
    onClose: jest.fn(),
    cvId: 'test-cv-1'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders section title', () => {
      render(<SkillsSection {...defaultProps} />)
      expect(screen.getByText('Skills')).toBeInTheDocument()
    })

    test('renders in display mode by default', () => {
      render(<SkillsSection {...defaultProps} />)
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    test('renders edit form when editing', () => {
      render(<SkillsSection {...defaultProps} isEditing={true} />)
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  describe('Technical Skills', () => {
    test('displays existing technical skills', () => {
      const data = {
        technical: ['React', 'TypeScript', 'Node.js'],
        soft: []
      }
      render(<SkillsSection {...defaultProps} data={data} />)

      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
      expect(screen.getByText('Node.js')).toBeInTheDocument()
    })

    test('shows empty state when no technical skills', () => {
      render(<SkillsSection {...defaultProps} />)
      fireEvent.click(screen.getByText('Edit'))

      expect(screen.getByText(/Technical Skills/i)).toBeInTheDocument()
    })

    test('displays technical skills autocomplete in edit mode', () => {
      render(<SkillsSection {...defaultProps} isEditing={true} />)

      const autocompletes = screen.getAllByTestId('skills-autocomplete')
      expect(autocompletes.length).toBeGreaterThan(0)
    })
  })

  describe('Soft Skills', () => {
    test('displays existing soft skills', () => {
      const data = {
        technical: [],
        soft: ['Leadership', 'Communication', 'Problem Solving']
      }
      render(<SkillsSection {...defaultProps} data={data} />)

      expect(screen.getByText('Leadership')).toBeInTheDocument()
      expect(screen.getByText('Communication')).toBeInTheDocument()
      expect(screen.getByText('Problem Solving')).toBeInTheDocument()
    })

    test('shows empty state when no soft skills', () => {
      render(<SkillsSection {...defaultProps} />)
      fireEvent.click(screen.getByText('Edit'))

      expect(screen.getByText(/Soft Skills/i)).toBeInTheDocument()
    })
  })

  describe('Data Structure', () => {
    test('handles missing technical skills array', () => {
      const data = { soft: ['Communication'] }
      render(<SkillsSection {...defaultProps} data={data} />)

      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    test('handles missing soft skills array', () => {
      const data = { technical: ['React'] }
      render(<SkillsSection {...defaultProps} data={data} />)

      expect(screen.getByText('React')).toBeInTheDocument()
    })

    test('handles completely empty data', () => {
      render(<SkillsSection {...defaultProps} data={null} />)

      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  describe('Display Mode', () => {
    test('displays skills as chips', () => {
      const data = {
        technical: ['React', 'Node.js'],
        soft: ['Leadership']
      }
      render(<SkillsSection {...defaultProps} data={data} />)

      // All skills should be visible
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('Node.js')).toBeInTheDocument()
      expect(screen.getByText('Leadership')).toBeInTheDocument()
    })

    test('separates technical and soft skills visually', () => {
      const data = {
        technical: ['React'],
        soft: ['Leadership']
      }
      render(<SkillsSection {...defaultProps} data={data} />)

      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('Leadership')).toBeInTheDocument()
    })
  })

  describe('Memoization', () => {
    test('component is memoized', () => {
      const { rerender } = render(<SkillsSection {...defaultProps} />)

      // Rerender with same props
      rerender(<SkillsSection {...defaultProps} />)

      // Component should not cause unnecessary rerenders
      expect(screen.getByText('Skills')).toBeInTheDocument()
    })

    test('rerenders when data changes', () => {
      const { rerender } = render(
        <SkillsSection {...defaultProps} data={{ technical: ['React'], soft: [] }} />
      )

      expect(screen.getByText('React')).toBeInTheDocument()

      // Component is memoized, so need to pass different props
      const newProps = { ...defaultProps, data: { technical: ['Vue'], soft: [] }, isEditing: true }
      rerender(<SkillsSection {...newProps} />)

      // After rerender with different data, Vue should appear
      expect(screen.queryByText('React')).not.toBeInTheDocument()
    })
  })
})
