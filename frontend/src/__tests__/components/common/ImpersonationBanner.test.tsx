/**
 * ImpersonationBanner Component Tests
 *
 * Tests for the security-critical impersonation banner that displays when
 * an admin is impersonating a user. Tests countdown timer, session termination,
 * keyboard shortcuts, and expiration warnings.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ImpersonationBanner } from '../../../components/common/ImpersonationBanner'
import { ImpersonationContext } from '../../../contexts/ImpersonationContext'
import * as impersonationService from '../../../services/impersonationService'

// Mock logger and errorHandler to avoid import.meta.env issues
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../../utils/errorHandler', () => ({
  ErrorHandler: jest.fn().mockImplementation(() => ({
    handle: jest.fn(),
    logError: jest.fn(),
  })),
}));

// Mock the impersonation service
jest.mock('../../../services/impersonationService', () => ({
  impersonationService: {
    isSessionExpiringSoon: jest.fn(),
    formatRemainingTime: jest.fn()
  },
  ImpersonationError: class ImpersonationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ImpersonationError'
    }
  }
}))

describe('ImpersonationBanner', () => {
  const mockEndImpersonation = jest.fn()
  const mockOnImpersonationEnd = jest.fn()

  const mockContextValue = {
    status: {
      active: false,
      target_user: null,
      session_id: null,
      expires_at: null,
      remaining_seconds: null
    },
    loading: false,
    error: null,
    checkStatus: jest.fn(),
    startImpersonation: jest.fn(),
    endImpersonation: mockEndImpersonation
  }

  const renderWithContext = (contextValue = mockContextValue, props = {}) => {
    return render(
      <ImpersonationContext.Provider value={contextValue}>
        <ImpersonationBanner {...props} />
      </ImpersonationContext.Provider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(impersonationService.impersonationService.isSessionExpiringSoon as jest.Mock).mockReturnValue(false)
    ;(impersonationService.impersonationService.formatRemainingTime as jest.Mock).mockReturnValue('15:00')
  })

  describe('Rendering', () => {
    test('does not render when impersonation is not active', () => {
      renderWithContext()
      expect(screen.queryByText(/Impersonating User/i)).not.toBeInTheDocument()
    })

    test('renders when impersonation is active', () => {
      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(), // 15 minutes
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)
      expect(screen.getByText(/Impersonating User/i)).toBeInTheDocument()
    })

    test('displays target user email', () => {
      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'testuser@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)
      expect(screen.getByText('testuser@example.com')).toBeInTheDocument()
    })

    test('displays remaining time', () => {
      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)
      expect(screen.getByText('15:00')).toBeInTheDocument()
    })

    test('displays Stop button', () => {
      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)
      expect(screen.getByRole('button', { name: /Stop/i })).toBeInTheDocument()
    })

    test('displays keyboard shortcut hint', () => {
      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)
      expect(screen.getByText(/Press Ctrl\+Shift\+E to end quickly/i)).toBeInTheDocument()
    })
  })

  describe('Expiration Warning', () => {
    test('shows warning severity when session is expiring soon', () => {
      ;(impersonationService.impersonationService.isSessionExpiringSoon as jest.Mock).mockReturnValue(true)

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 240000).toISOString(), // 4 minutes
          remaining_seconds: 240
        }
      }

      const { container } = renderWithContext(activeContext)
      expect(container.querySelector('.MuiAlert-standardWarning')).toBeInTheDocument()
    })

    test('shows "Expiring Soon" chip when session is expiring', () => {
      ;(impersonationService.impersonationService.isSessionExpiringSoon as jest.Mock).mockReturnValue(true)

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 240000).toISOString(),
          remaining_seconds: 240
        }
      }

      renderWithContext(activeContext)
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument()
    })

    test('shows info severity when session has plenty of time', () => {
      ;(impersonationService.impersonationService.isSessionExpiringSoon as jest.Mock).mockReturnValue(false)

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      const { container } = renderWithContext(activeContext)
      expect(container.querySelector('.MuiAlert-standardInfo')).toBeInTheDocument()
    })

    test('does not show "Expiring Soon" chip when plenty of time remains', () => {
      ;(impersonationService.impersonationService.isSessionExpiringSoon as jest.Mock).mockReturnValue(false)

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)
      expect(screen.queryByText('Expiring Soon')).not.toBeInTheDocument()
    })
  })

  describe('Session Termination', () => {
    test('calls endImpersonation when Stop button clicked', async () => {
      const user = userEvent.setup()
      mockEndImpersonation.mockResolvedValue(undefined)

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext, { onImpersonationEnd: mockOnImpersonationEnd })

      const stopButton = screen.getByRole('button', { name: /Stop/i })
      await user.click(stopButton)

      await waitFor(() => {
        expect(mockEndImpersonation).toHaveBeenCalledTimes(1)
      })
    })

    test('calls onImpersonationEnd callback after successful termination', async () => {
      const user = userEvent.setup()
      mockEndImpersonation.mockResolvedValue(undefined)

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext, { onImpersonationEnd: mockOnImpersonationEnd })

      const stopButton = screen.getByRole('button', { name: /Stop/i })
      await user.click(stopButton)

      await waitFor(() => {
        expect(mockOnImpersonationEnd).toHaveBeenCalledTimes(1)
      })
    })

    test('shows loading state while ending impersonation', async () => {
      const user = userEvent.setup()
      mockEndImpersonation.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)

      const stopButton = screen.getByRole('button', { name: /Stop/i })
      await user.click(stopButton)

      expect(screen.getByText('Ending...')).toBeInTheDocument()
      expect(stopButton).toBeDisabled()
    })

    test('disables button during termination to prevent double-click', async () => {
      const user = userEvent.setup()
      mockEndImpersonation.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)

      const stopButton = screen.getByRole('button', { name: /Stop/i })
      await user.click(stopButton)

      // Try clicking again
      await user.click(stopButton)

      // Should only be called once
      await waitFor(() => {
        expect(mockEndImpersonation).toHaveBeenCalledTimes(1)
      })
    })

    test('shows error snackbar when termination fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to end session'
      mockEndImpersonation.mockRejectedValue(new Error(errorMessage))

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)

      const stopButton = screen.getByRole('button', { name: /Stop/i })
      await user.click(stopButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to end impersonation session')).toBeInTheDocument()
      })
    })

    test('shows custom error message for ImpersonationError', async () => {
      const user = userEvent.setup()
      const ImpersonationError = (impersonationService as any).ImpersonationError
      mockEndImpersonation.mockRejectedValue(new ImpersonationError('Session expired'))

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)

      const stopButton = screen.getByRole('button', { name: /Stop/i })
      await user.click(stopButton)

      await waitFor(() => {
        expect(screen.getByText('Session expired')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    test('ends impersonation when Ctrl+Shift+E is pressed', async () => {
      mockEndImpersonation.mockResolvedValue(undefined)

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'E',
          ctrlKey: true,
          shiftKey: true
        })
      })

      await waitFor(() => {
        expect(mockEndImpersonation).toHaveBeenCalledTimes(1)
      })
    })

    test('ends impersonation when Cmd+Shift+E is pressed on Mac', async () => {
      mockEndImpersonation.mockResolvedValue(undefined)

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'E',
          metaKey: true,
          shiftKey: true
        })
      })

      await waitFor(() => {
        expect(mockEndImpersonation).toHaveBeenCalledTimes(1)
      })
    })

    test('does not trigger on keyboard shortcut when not impersonating', async () => {
      renderWithContext()

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'E',
          ctrlKey: true,
          shiftKey: true
        })
      })

      expect(mockEndImpersonation).not.toHaveBeenCalled()
    })

    test('does not trigger on keyboard shortcut when already ending', async () => {
      mockEndImpersonation.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      const user = userEvent.setup()
      renderWithContext(activeContext)

      // Click button first
      await user.click(screen.getByRole('button', { name: /Stop/i }))

      // Try keyboard shortcut
      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'E',
          ctrlKey: true,
          shiftKey: true
        })
      })

      await waitFor(() => {
        expect(mockEndImpersonation).toHaveBeenCalledTimes(1)
      })
    })

    test('prevents default browser behavior on keyboard shortcut', async () => {
      mockEndImpersonation.mockResolvedValue(undefined)

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)

      const event = new KeyboardEvent('keydown', {
        key: 'E',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault')

      await act(async () => {
        document.dispatchEvent(event)
      })

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    test('Stop button has proper aria-label', () => {
      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)
      const stopButton = screen.getByRole('button', { name: /End impersonation session/i })
      expect(stopButton).toBeInTheDocument()
    })

    test('remaining time has aria-live region', () => {
      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      renderWithContext(activeContext)
      const timeDisplay = screen.getByLabelText(/Time remaining/i)
      expect(timeDisplay).toHaveAttribute('aria-live', 'polite')
    })

    test('banner is sticky at top of viewport', () => {
      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      const { container } = renderWithContext(activeContext)
      const alert = container.querySelector('.MuiAlert-root')
      expect(alert).toHaveStyle({ position: 'sticky' })
    })
  })

  describe('Edge Cases', () => {
    test('handles zero remaining seconds', () => {
      ;(impersonationService.impersonationService.formatRemainingTime as jest.Mock).mockReturnValue('0:00')

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date().toISOString(),
          remaining_seconds: 0
        }
      }

      renderWithContext(activeContext)
      expect(screen.getByText('0:00')).toBeInTheDocument()
    })

    test('handles null remaining_seconds', () => {
      ;(impersonationService.impersonationService.formatRemainingTime as jest.Mock).mockReturnValue('--:--')

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: null
        }
      }

      renderWithContext(activeContext)
      expect(screen.getByText('--:--')).toBeInTheDocument()
    })

    test('cleans up keyboard event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const activeContext = {
        ...mockContextValue,
        status: {
          active: true,
          target_user: { email: 'user@example.com', id: 'user-123' },
          session_id: 'session-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          remaining_seconds: 900
        }
      }

      const { unmount } = renderWithContext(activeContext)
      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })
})
