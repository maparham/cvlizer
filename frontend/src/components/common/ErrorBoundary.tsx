/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree and displays
 * a fallback UI instead of the component tree that crashed.
 */
import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ErrorIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import BugIcon from "@mui/icons-material/BugReport";

const CHUNK_RELOAD_FLAG = "cv_lator_chunk_reload_attempted";

const isDynamicImportError = (error: Error): boolean => {
  const message = error?.message || "";

  return (
    error?.name === "ChunkLoadError" ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed")
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean; // If true, only catches errors in this boundary
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
  errorId: string;
}

/**
 * Main Error Boundary Component
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Special handling for failed dynamic imports / chunk load errors.
    // These typically happen when a new deployment changes chunk hashes
    // while the user still has an older version of the app loaded.
    if (isDynamicImportError(error)) {
      try {
        const hasReloaded = sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "true";

        if (!hasReloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_FLAG, "true");
          window.location.reload();
          return;
        }

        // We already tried a reload and still hit a chunk error.
        // Clear the flag so subsequent errors follow the normal path.
        sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
      } catch {
        // Swallow storage errors and fall through to normal handling.
      }
    }

    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to external service (you can replace this with your preferred logging service)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // This is where you'd send the error to your logging service
    // For now, we'll just log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🚨 Error Boundary - Detailed Error Info");
      console.error("Error:", error);
      console.error("Component Stack:", errorInfo.componentStack);
      console.error("Error Stack:", error.stack);
      console.groupEnd();
    }

    // In production, you might send this to a service like Sentry, LogRocket, etc.
    // Example:
    // Sentry.captureException(error, {
    //   contexts: { react: { componentStack: errorInfo.componentStack } }
    // })
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state;

      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={error!}
            errorInfo={errorInfo}
            resetError={this.handleReset}
            errorId={errorId}
          />
        );
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={error!}
          errorInfo={errorInfo}
          resetError={this.handleReset}
          errorId={errorId}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback Component
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  errorId,
}) => {
  const handleReload = () => {
    window.location.reload();
  };

  const copyErrorInfo = async () => {
    const errorDetails = `
Error ID: ${errorId}
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo?.componentStack ?? "N/A"}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      // You could show a toast notification here
    } catch (err) {
      console.error("Failed to copy error details:", err);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ErrorIcon />
            Something went wrong
          </AlertTitle>
          <Typography variant="body2" sx={{ mt: 1 }}>
            An unexpected error occurred in this part of the application. You
            can try refreshing the page or contact support if the problem
            persists.
          </Typography>
        </Alert>

        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={resetError}
            color="primary"
          >
            Try Again
          </Button>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReload}
          >
            Reload Page
          </Button>

          <Button
            variant="outlined"
            startIcon={<BugIcon />}
            onClick={copyErrorInfo}
            size="small"
          >
            Copy Error Info
          </Button>
        </Box>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Technical Details (Error ID: {errorId})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
              <Typography variant="subtitle2" gutterBottom>
                Error Message:
              </Typography>
              <Box
                sx={{
                  bgcolor: "grey.100",
                  p: 1,
                  borderRadius: 1,
                  mb: 2,
                  wordBreak: "break-word",
                }}
              >
                {error.message}
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Error Stack:
              </Typography>
              <Box
                sx={{
                  bgcolor: "grey.100",
                  p: 1,
                  borderRadius: 1,
                  mb: 2,
                  maxHeight: 200,
                  overflow: "auto",
                  fontSize: "0.75rem",
                }}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {error.stack}
                </pre>
              </Box>

              {errorInfo && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Component Stack:
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: "grey.100",
                      p: 1,
                      borderRadius: 1,
                      maxHeight: 200,
                      overflow: "auto",
                      fontSize: "0.75rem",
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                      {errorInfo.componentStack}
                    </pre>
                  </Box>
                </>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Box>
  );
};

/**
 * Lightweight Error Fallback for smaller components
 */
export const CompactErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  return (
    <Alert
      severity="error"
      sx={{ my: 2 }}
      action={
        <Button size="small" onClick={resetError}>
          Retry
        </Button>
      }
    >
      <AlertTitle>Error</AlertTitle>
      {error.message}
    </Alert>
  );
};

/**
 * Hook for error boundary integration
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // Throw error on next render to trigger error boundary
  if (error) {
    throw error;
  }

  return { captureError, resetError };
};

/**
 * Higher-order component for wrapping components with error boundaries
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ErrorBoundary;
