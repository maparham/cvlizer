/**
 * Common Components Index
 *
 * Exports reusable components that can be used across the application
 */

export {
  default as ErrorBoundary,
  CompactErrorFallback,
  useErrorHandler,
  withErrorBoundary
} from './ErrorBoundary'
export type { ErrorFallbackProps } from './ErrorBoundary'

export { default as ImpersonationBanner } from './ImpersonationBanner'
export { default as MarkdownRenderer } from './MarkdownRenderer'
export { default as ConfirmDialog } from './ConfirmDialog'
