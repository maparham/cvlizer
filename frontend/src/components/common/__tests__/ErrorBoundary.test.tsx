/**
 * Unit tests for ErrorBoundary component
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ErrorBoundary, CompactErrorFallback, useErrorHandler, withErrorBoundary } from '../ErrorBoundary'

// Mock console.error to prevent error logs in tests
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should render default error fallback when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Reload Page')).toBeInTheDocument()
  })

  it('should render custom fallback component when provided', () => {
    const CustomFallback: React.FC<any> = ({ error, resetError }) => (
      <div>
        <p>Custom error: {error.message}</p>
        <button onClick={resetError}>Reset</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('should reset error state when Try Again is clicked', () => {
    let shouldThrow = true
    
    const DynamicThrowError = () => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>No error</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <DynamicThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Change the error condition before clicking reset
    shouldThrow = false
    
    fireEvent.click(screen.getByText('Try Again'))

    // Rerender with no error
    rerender(
      <ErrorBoundary>
        <DynamicThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should show technical details in accordion', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Find and click the accordion to expand technical details
    const technicalDetailsButton = screen.getByText(/Technical Details/)
    fireEvent.click(technicalDetailsButton)

    expect(screen.getByText('Error Message:')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })
})

describe('CompactErrorFallback', () => {
  const mockProps = {
    error: new Error('Test error'),
    errorInfo: { componentStack: 'test stack' } as React.ErrorInfo,
    resetError: jest.fn(),
    errorId: 'test-error-123'
  }

  it('should render compact error message', () => {
    render(<CompactErrorFallback {...mockProps} />)

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('should call resetError when Retry is clicked', () => {
    render(<CompactErrorFallback {...mockProps} />)

    fireEvent.click(screen.getByText('Retry'))

    expect(mockProps.resetError).toHaveBeenCalled()
  })
})

describe('useErrorHandler', () => {
  it('should provide captureError and resetError functions', () => {
    let errorHandler: any

    const TestComponent = () => {
      errorHandler = useErrorHandler()
      return <div>Test</div>
    }

    render(<TestComponent />)

    expect(typeof errorHandler.captureError).toBe('function')
    expect(typeof errorHandler.resetError).toBe('function')
  })

  it('should provide captureError function that triggers error boundary', () => {
    const TestComponent = () => {
      const { captureError } = useErrorHandler()
      
      // Simulate capturing an error immediately
      React.useEffect(() => {
        captureError(new Error('Captured error'))
      }, [captureError])
      
      return <div>Test</div>
    }

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    // The error should be thrown and caught by ErrorBoundary
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})

describe('withErrorBoundary', () => {
  it('should wrap component with error boundary', () => {
    const TestComponent = () => <div>Test Component</div>
    const WrappedComponent = withErrorBoundary(TestComponent)

    render(<WrappedComponent />)

    expect(screen.getByText('Test Component')).toBeInTheDocument()
  })

  it('should catch errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError)

    render(<WrappedComponent shouldThrow={true} />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should apply custom error boundary props', () => {
    const onError = jest.fn()
    const WrappedComponent = withErrorBoundary(ThrowError, { onError })

    render(<WrappedComponent shouldThrow={true} />)

    expect(onError).toHaveBeenCalled()
  })

  it('should set correct display name', () => {
    const TestComponent = () => <div>Test</div>
    TestComponent.displayName = 'TestComponent'
    
    const WrappedComponent = withErrorBoundary(TestComponent)

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
  })
})
