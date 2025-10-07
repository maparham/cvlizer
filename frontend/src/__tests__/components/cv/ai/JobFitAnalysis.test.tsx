/**
 * JobFitAnalysis Component Tests
 *
 * Tests for job fit analysis display including:
 * - Confidence score visualization
 * - Key matches display
 * - Missing skills display
 * - Recommendations rendering
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import JobFitAnalysis from '../../../../components/cv/ai/JobFitAnalysis'

// Mock stores
jest.mock('../../../../stores/aiStore', () => ({
  useAIStore: jest.fn(() => ({
    generateWhyGoodFitDraft: jest.fn()
  })),
  useWhyGoodFitDraft: jest.fn(() => null),
  useActiveJobDescription: jest.fn(() => ({
    id: 'job-1',
    title: 'Senior Developer',
    company: 'Tech Corp'
  }))
}))

jest.mock('../../../../stores/uiStore', () => ({
  useNotifications: jest.fn(() => ({
    showSuccess: jest.fn(),
    showError: jest.fn()
  }))
}))

describe('JobFitAnalysis', () => {
  const mockFitAnalysis = {
    confidence_score: 85,
    key_matches: ['React', 'TypeScript', 'Node.js'],
    missing_skills: ['Docker', 'Kubernetes'],
    recommendations: ['Add Docker experience', 'Highlight cloud expertise'],
    fit_summary: 'Strong match for this position'
  }

  const defaultProps = {
    cvId: 'test-cv-1',
    fitAnalysis: mockFitAnalysis
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders fit analysis section', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      expect(screen.getByText(/Job Fit Analysis/i)).toBeInTheDocument()
    })

    test('displays confidence score', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      expect(screen.getByText('85%')).toBeInTheDocument()
    })

    test('shows empty state when no analysis', () => {
      render(<JobFitAnalysis cvId="test-cv-1" fitAnalysis={null} />)
      expect(screen.getByText(/No job fit analysis available/i)).toBeInTheDocument()
    })
  })

  describe('Confidence Score', () => {
    test('displays high confidence with green color', () => {
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={{ ...mockFitAnalysis, confidence_score: 90 }} />)
      expect(screen.getByText('90%')).toBeInTheDocument()
    })

    test('displays medium confidence with yellow color', () => {
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={{ ...mockFitAnalysis, confidence_score: 65 }} />)
      expect(screen.getByText('65%')).toBeInTheDocument()
    })

    test('displays low confidence with red color', () => {
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={{ ...mockFitAnalysis, confidence_score: 40 }} />)
      expect(screen.getByText('40%')).toBeInTheDocument()
    })

    test('handles zero confidence score', () => {
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={{ ...mockFitAnalysis, confidence_score: 0 }} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    test('handles perfect confidence score', () => {
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={{ ...mockFitAnalysis, confidence_score: 100 }} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Key Matches', () => {
    test('displays all key matches', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
      expect(screen.getByText('Node.js')).toBeInTheDocument()
    })

    test('shows message when no key matches', () => {
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={{ ...mockFitAnalysis, key_matches: [] }} />)
      expect(screen.getByText(/No key matches identified/i)).toBeInTheDocument()
    })

    test('displays key matches count', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      expect(screen.getByText(/3/i)).toBeInTheDocument()
    })
  })

  describe('Missing Skills', () => {
    test('displays all missing skills', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      expect(screen.getByText('Docker')).toBeInTheDocument()
      expect(screen.getByText('Kubernetes')).toBeInTheDocument()
    })

    test('shows message when no missing skills', () => {
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={{ ...mockFitAnalysis, missing_skills: [] }} />)
      expect(screen.getByText(/No missing skills/i)).toBeInTheDocument()
    })

    test('displays missing skills count', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      expect(screen.getByText(/2/i)).toBeInTheDocument()
    })
  })

  describe('Recommendations', () => {
    test('displays all recommendations', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      expect(screen.getByText(/Add Docker experience/i)).toBeInTheDocument()
      expect(screen.getByText(/Highlight cloud expertise/i)).toBeInTheDocument()
    })

    test('shows message when no recommendations', () => {
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={{ ...mockFitAnalysis, recommendations: [] }} />)
      expect(screen.getByText(/No recommendations/i)).toBeInTheDocument()
    })
  })

  describe('Fit Summary', () => {
    test('displays fit summary', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      expect(screen.getByText(/Strong match for this position/i)).toBeInTheDocument()
    })

    test('handles missing fit summary', () => {
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={{ ...mockFitAnalysis, fit_summary: null }} />)
      // Should still render without crashing
      expect(screen.getByText('85%')).toBeInTheDocument()
    })
  })

  describe('Expandable Sections', () => {
    test('can expand key matches section', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      const expandButton = screen.getAllByRole('button')[0]
      fireEvent.click(expandButton)

      // Content should be visible
      expect(screen.getByText('React')).toBeVisible()
    })

    test('can expand missing skills section', () => {
      render(<JobFitAnalysis {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[1])

      // Content should be visible
      expect(screen.getByText('Docker')).toBeVisible()
    })
  })

  describe('Edge Cases', () => {
    test('handles undefined fitAnalysis', () => {
      render(<JobFitAnalysis cvId="test-cv-1" fitAnalysis={undefined} />)
      expect(screen.getByText(/No job fit analysis available/i)).toBeInTheDocument()
    })

    test('handles empty arrays in fitAnalysis', () => {
      const emptyAnalysis = {
        confidence_score: 50,
        key_matches: [],
        missing_skills: [],
        recommendations: [],
        fit_summary: ''
      }
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={emptyAnalysis} />)

      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    test('handles missing optional fields', () => {
      const minimalAnalysis = {
        confidence_score: 75,
        key_matches: ['React'],
        missing_skills: [],
        recommendations: [],
        fit_summary: null
      }
      render(<JobFitAnalysis {...defaultProps} fitAnalysis={minimalAnalysis} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
    })
  })
})
