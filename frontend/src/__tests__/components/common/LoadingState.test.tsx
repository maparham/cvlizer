/**
 * LoadingState Component Tests
 *
 * Tests for the reusable loading indicator component used throughout
 * the application for consistent loading UX.
 */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import LoadingState from '../../../components/common/LoadingState'

describe('LoadingState', () => {
  describe('Rendering - Centered Variant (Default)', () => {
    test('renders with default message', () => {
      render(<LoadingState />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    test('renders CircularProgress spinner', () => {
      const { container } = render(<LoadingState />)
      expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument()
    })

    test('renders custom message', () => {
      render(<LoadingState message="Loading data..." />)
      expect(screen.getByText('Loading data...')).toBeInTheDocument()
    })

    test('does not render message when empty string provided', () => {
      render(<LoadingState message="" />)
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    test('uses centered layout by default', () => {
      const { container } = render(<LoadingState />)
      const box = container.firstChild as HTMLElement
      expect(box).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      })
    })

    test('applies default spinner size', () => {
      const { container } = render(<LoadingState />)
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '24px', height: '24px' })
    })

    test('applies custom spinner size', () => {
      const { container } = render(<LoadingState size={48} />)
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '48px', height: '48px' })
    })

    test('adds padding to centered variant', () => {
      const { container } = render(<LoadingState variant="centered" />)
      const box = container.firstChild as HTMLElement
      expect(box).toHaveStyle({ padding: '24px' })
    })
  })

  describe('Rendering - Inline Variant', () => {
    test('renders inline variant correctly', () => {
      const { container } = render(<LoadingState variant="inline" />)
      const box = container.firstChild as HTMLElement
      expect(box).toHaveStyle({
        display: 'flex',
        alignItems: 'center'
      })
    })

    test('inline variant has horizontal layout', () => {
      const { container } = render(<LoadingState variant="inline" />)
      const box = container.firstChild as HTMLElement
      expect(box).not.toHaveStyle({ flexDirection: 'column' })
    })

    test('inline variant renders message', () => {
      render(<LoadingState variant="inline" message="Processing..." />)
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    test('inline variant renders spinner', () => {
      const { container } = render(<LoadingState variant="inline" />)
      expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument()
    })

    test('inline variant respects custom size', () => {
      const { container } = render(<LoadingState variant="inline" size={16} />)
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '16px', height: '16px' })
    })

    test('inline variant does not render message when empty', () => {
      render(<LoadingState variant="inline" message="" />)
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  describe('Typography Styling', () => {
    test('message uses body2 variant', () => {
      render(<LoadingState message="Test" />)
      const message = screen.getByText('Test')
      expect(message).toHaveClass('MuiTypography-body2')
    })

    test('message has body2 variant', () => {
      render(<LoadingState message="Test" />)
      const message = screen.getByText('Test')
      expect(message).toHaveClass('MuiTypography-body2')
    })

    test('inline variant message uses same typography', () => {
      render(<LoadingState variant="inline" message="Test" />)
      const message = screen.getByText('Test')
      expect(message).toHaveClass('MuiTypography-body2')
    })
  })

  describe('Props Variations', () => {
    test('handles all props together', () => {
      const { container } = render(
        <LoadingState
          message="Custom loading message"
          size={32}
          variant="centered"
        />
      )

      expect(screen.getByText('Custom loading message')).toBeInTheDocument()
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '32px', height: '32px' })
    })

    test('handles minimal props', () => {
      const { container } = render(<LoadingState />)
      expect(container.firstChild).toBeInTheDocument()
    })

    test('switches between variants', () => {
      const { container, rerender } = render(<LoadingState variant="centered" />)
      let box = container.firstChild as HTMLElement
      expect(box).toHaveStyle({ flexDirection: 'column' })

      rerender(<LoadingState variant="inline" />)
      box = container.firstChild as HTMLElement
      expect(box).not.toHaveStyle({ flexDirection: 'column' })
    })

    test('updates message dynamically', () => {
      const { rerender } = render(<LoadingState message="Loading..." />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      rerender(<LoadingState message="Almost done..." />)
      expect(screen.getByText('Almost done...')).toBeInTheDocument()
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  describe('Different Sizes', () => {
    test('renders with small size', () => {
      const { container } = render(<LoadingState size={16} />)
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '16px', height: '16px' })
    })

    test('renders with medium size', () => {
      const { container } = render(<LoadingState size={32} />)
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '32px', height: '32px' })
    })

    test('renders with large size', () => {
      const { container } = render(<LoadingState size={64} />)
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '64px', height: '64px' })
    })
  })

  describe('Common Use Cases', () => {
    test('loading users scenario', () => {
      render(<LoadingState message="Loading users..." />)
      expect(screen.getByText('Loading users...')).toBeInTheDocument()
    })

    test('processing scenario', () => {
      render(<LoadingState message="Processing your request..." variant="inline" />)
      expect(screen.getByText('Processing your request...')).toBeInTheDocument()
    })

    test('fetching data scenario', () => {
      render(<LoadingState message="Fetching CV data..." size={40} />)
      expect(screen.getByText('Fetching CV data...')).toBeInTheDocument()
    })

    test('inline button loading', () => {
      const { container } = render(
        <LoadingState variant="inline" message="Saving..." size={20} />
      )
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '20px', height: '20px' })
    })
  })

  describe('Accessibility', () => {
    test('CircularProgress has implicit loading role', () => {
      const { container } = render(<LoadingState />)
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toBeInTheDocument()
    })

    test('message is readable by screen readers', () => {
      render(<LoadingState message="Loading content" />)
      const message = screen.getByText('Loading content')
      expect(message).toBeVisible()
    })

    test('component structure is semantic', () => {
      const { container } = render(<LoadingState message="Test" />)
      const box = container.firstChild
      expect(box?.nodeName).toBe('DIV')
    })
  })

  describe('Edge Cases', () => {
    test('handles undefined message', () => {
      render(<LoadingState message={undefined} />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    test('handles very long message', () => {
      const longMessage = 'This is a very long loading message that might wrap to multiple lines in the UI'
      render(<LoadingState message={longMessage} />)
      expect(screen.getByText(longMessage)).toBeInTheDocument()
    })

    test('handles size of 0', () => {
      const { container } = render(<LoadingState size={0} />)
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '0px', height: '0px' })
    })

    test('handles very large size', () => {
      const { container } = render(<LoadingState size={200} />)
      const spinner = container.querySelector('.MuiCircularProgress-root')
      expect(spinner).toHaveStyle({ width: '200px', height: '200px' })
    })

    test('renders without crashing with all undefined props', () => {
      const { container } = render(
        <LoadingState
          message={undefined}
          size={undefined}
          variant={undefined}
        />
      )
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Multiple Instances', () => {
    test('renders multiple loading states independently', () => {
      const { container } = render(
        <div>
          <LoadingState message="Loading 1" />
          <LoadingState message="Loading 2" variant="inline" />
        </div>
      )

      expect(screen.getByText('Loading 1')).toBeInTheDocument()
      expect(screen.getByText('Loading 2')).toBeInTheDocument()
      expect(container.querySelectorAll('.MuiCircularProgress-root')).toHaveLength(2)
    })

    test('different variants render differently in same view', () => {
      const { container } = render(
        <div>
          <LoadingState variant="centered" message="Centered" />
          <LoadingState variant="inline" message="Inline" />
        </div>
      )

      const boxes = container.querySelectorAll('div > div')
      expect(boxes.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Component Structure', () => {
    test('centered variant has correct gap between spinner and message', () => {
      const { container } = render(<LoadingState message="Test" variant="centered" />)
      const box = container.firstChild as HTMLElement
      expect(box).toHaveStyle({ gap: '16px' })
    })

    test('inline variant has correct gap between spinner and message', () => {
      const { container } = render(<LoadingState message="Test" variant="inline" />)
      const box = container.firstChild as HTMLElement
      expect(box).toHaveStyle({ gap: '8px' })
    })

    test('only renders message when provided', () => {
      const { container: container1 } = render(<LoadingState message="Test" />)
      expect(container1.querySelector('.MuiTypography-root')).toBeInTheDocument()

      const { container: container2 } = render(<LoadingState message="" />)
      expect(container2.querySelector('.MuiTypography-root')).not.toBeInTheDocument()
    })
  })
})
