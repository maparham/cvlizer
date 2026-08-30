/**
 * SkillsAutocomplete Component Tests
 *
 * Tests for the skill add/search input:
 * - Suggestions dropdown only opens on focus
 * - Clicking a suggestion adds the skill directly
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SkillsAutocomplete from '../../../../components/cv/ui/SkillsAutocomplete'

describe('SkillsAutocomplete', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onAdd: jest.fn(),
    onAddDirect: jest.fn(),
    placeholder: 'Add skill to Programming',
    skillType: 'technical' as const,
    existingSkills: ['Python']
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('does not show suggestions dropdown before the input is focused', () => {
    render(<SkillsAutocomplete {...defaultProps} />)

    expect(screen.queryByText(/Popular Technical Skills/i)).not.toBeInTheDocument()
  })

  test('shows popular skills dropdown when the empty input is focused', () => {
    render(<SkillsAutocomplete {...defaultProps} />)

    fireEvent.focus(screen.getByPlaceholderText('Add skill to Programming'))

    expect(screen.getByText(/Popular Technical Skills/i)).toBeInTheDocument()
  })

  test('clicking a search suggestion adds the skill directly', () => {
    render(<SkillsAutocomplete {...defaultProps} value="Type" />)

    const input = screen.getByPlaceholderText('Add skill to Programming')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'TypeScript' } })

    fireEvent.click(screen.getByText('TypeScript'))

    expect(defaultProps.onAddDirect).toHaveBeenCalledWith('TypeScript')
  })
})
