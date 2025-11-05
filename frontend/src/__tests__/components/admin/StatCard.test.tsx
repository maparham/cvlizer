/**
 * StatCard Component Tests
 *
 * Tests for the StatCard component used throughout the admin dashboard
 * to display statistics with icons, values, and optional trends.
 */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import StatCard from '../../../components/admin/StatCard'
import { People as PeopleIcon } from '@mui/icons-material'

describe('StatCard', () => {
  const defaultProps = {
    title: 'Total Users',
    value: 1234,
    icon: <PeopleIcon data-testid="stat-icon" />
  }

  describe('Rendering', () => {
    test('renders title correctly', () => {
      render(<StatCard {...defaultProps} />)
      expect(screen.getByText('Total Users')).toBeInTheDocument()
    })

    test('renders value with locale formatting', () => {
      render(<StatCard {...defaultProps} />)
      // toLocaleString formats 1234 as "1,234"
      expect(screen.getByText('1,234')).toBeInTheDocument()
    })

    test('renders icon correctly', () => {
      render(<StatCard {...defaultProps} />)
      expect(screen.getByTestId('stat-icon')).toBeInTheDocument()
    })

    test('renders without trend when not provided', () => {
      render(<StatCard {...defaultProps} />)
      expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    })
  })

  describe('Number Formatting', () => {
    test('formats large numbers with commas', () => {
      render(<StatCard {...defaultProps} value={1234567} />)
      expect(screen.getByText('1,234,567')).toBeInTheDocument()
    })

    test('formats zero correctly', () => {
      render(<StatCard {...defaultProps} value={0} />)
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    test('formats small numbers without commas', () => {
      render(<StatCard {...defaultProps} value={999} />)
      expect(screen.getByText('999')).toBeInTheDocument()
    })

    test('formats millions correctly', () => {
      render(<StatCard {...defaultProps} value={1000000} />)
      expect(screen.getByText('1,000,000')).toBeInTheDocument()
    })
  })

  describe('Trend Information', () => {
    test('renders trend when provided', () => {
      const trend = { value: 15, label: 'this month' }
      render(<StatCard {...defaultProps} trend={trend} />)

      expect(screen.getByText(/15%/)).toBeInTheDocument()
      expect(screen.getByText(/this month/)).toBeInTheDocument()
    })

    test('displays TrendingUp icon with trend', () => {
      const trend = { value: 10, label: 'increase' }
      render(<StatCard {...defaultProps} trend={trend} />)

      // TrendingUp icon should be present
      const trendSection = screen.getByText(/10%/).closest('div')
      expect(trendSection).toBeInTheDocument()
    })

    test('handles negative trend values', () => {
      const trend = { value: -5, label: 'this week' }
      render(<StatCard {...defaultProps} trend={trend} />)

      expect(screen.getByText(/-5%/)).toBeInTheDocument()
    })

    test('handles zero trend value', () => {
      const trend = { value: 0, label: 'no change' }
      render(<StatCard {...defaultProps} trend={trend} />)

      expect(screen.getByText(/0%/)).toBeInTheDocument()
      expect(screen.getByText(/no change/)).toBeInTheDocument()
    })
  })

  describe('Color Themes', () => {
    test('applies default primary color when not specified', () => {
      const { container } = render(<StatCard {...defaultProps} />)
      // Icon container should have color styling
      expect(container.querySelector('[class*="MuiBox"]')).toBeInTheDocument()
    })

    test('accepts custom color prop', () => {
      render(<StatCard {...defaultProps} color="success" />)
      // Component should render without errors with custom color
      expect(screen.getByText('Total Users')).toBeInTheDocument()
    })

    test('renders with different color values', () => {
      const colors = ['primary', 'secondary', 'error', 'warning', 'info', 'success']

      colors.forEach(color => {
        const { unmount } = render(<StatCard {...defaultProps} color={color} />)
        expect(screen.getByText('Total Users')).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Layout and Structure', () => {
    test('uses Card component for container', () => {
      const { container } = render(<StatCard {...defaultProps} />)
      expect(container.querySelector('.MuiCard-root')).toBeInTheDocument()
    })

    test('uses CardContent for content', () => {
      const { container } = render(<StatCard {...defaultProps} />)
      expect(container.querySelector('.MuiCardContent-root')).toBeInTheDocument()
    })

    test('displays title as h6 variant', () => {
      render(<StatCard {...defaultProps} />)
      const title = screen.getByText('Total Users')
      expect(title).toHaveClass('MuiTypography-h6')
    })

    test('displays value as h4 variant', () => {
      render(<StatCard {...defaultProps} />)
      const value = screen.getByText('1,234')
      expect(value).toHaveClass('MuiTypography-h4')
    })
  })

  describe('Accessibility', () => {
    test('title has proper typography variant', () => {
      render(<StatCard {...defaultProps} />)
      const title = screen.getByText('Total Users')
      expect(title).toHaveClass('MuiTypography-h6')
    })

    test('value uses semantic heading', () => {
      render(<StatCard {...defaultProps} />)
      const value = screen.getByText('1,234')
      expect(value.tagName).toBe('H2')
    })

    test('provides proper text hierarchy', () => {
      const trend = { value: 10, label: 'increase' }
      render(<StatCard {...defaultProps} trend={trend} />)

      // Title should be h6
      expect(screen.getByText('Total Users')).toHaveClass('MuiTypography-h6')
      // Value should be h4
      expect(screen.getByText('1,234')).toHaveClass('MuiTypography-h4')
      // Trend text should exist
      expect(screen.getByText(/10%/)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles very large numbers', () => {
      render(<StatCard {...defaultProps} value={999999999} />)
      expect(screen.getByText('999,999,999')).toBeInTheDocument()
    })

    test('handles empty title string', () => {
      render(<StatCard {...defaultProps} title="" />)
      expect(screen.queryByText('Total Users')).not.toBeInTheDocument()
    })

    test('handles trend with very large percentage', () => {
      const trend = { value: 1000, label: 'increase' }
      render(<StatCard {...defaultProps} trend={trend} />)
      expect(screen.getByText(/1000%/)).toBeInTheDocument()
    })

    test('handles trend with decimal values', () => {
      const trend = { value: 12.5, label: 'this month' }
      render(<StatCard {...defaultProps} trend={trend} />)
      expect(screen.getByText(/12.5%/)).toBeInTheDocument()
    })

    test('renders without crashing when all optional props are undefined', () => {
      render(
        <StatCard
          title="Simple Stat"
          value={100}
          icon={<PeopleIcon />}
        />
      )
      expect(screen.getByText('Simple Stat')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  describe('Multiple Instances', () => {
    test('renders multiple StatCards independently', () => {
      const { rerender } = render(
        <div>
          <StatCard title="Users" value={100} icon={<PeopleIcon />} />
          <StatCard title="CVs" value={250} icon={<PeopleIcon />} />
        </div>
      )

      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('CVs')).toBeInTheDocument()
      expect(screen.getByText('250')).toBeInTheDocument()

      // Update props and verify independent rendering
      rerender(
        <div>
          <StatCard title="Users" value={150} icon={<PeopleIcon />} />
          <StatCard title="CVs" value={250} icon={<PeopleIcon />} />
        </div>
      )

      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('250')).toBeInTheDocument()
    })
  })
})
