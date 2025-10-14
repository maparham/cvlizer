/**
 * Error Boundary Component
 *
 * This component catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 *
 * Key responsibilities:
 * - Catch errors in child components during rendering
 * - Log errors for debugging purposes
 * - Display user-friendly error UI
 * - Provide error recovery mechanisms
 *
 * Usage:
 * - Wrap components that might throw errors
 * - Provides graceful error handling for the entire application
 * - Helps identify and debug rendering issues
 */
import { Component, ErrorInfo, ReactNode } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console for debugging
    console.error("ErrorBoundary caught an error:", error);
    console.error("Error info:", errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          padding={2}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              maxWidth: 600,
              width: "100%",
              textAlign: "center",
            }}
          >
            <Typography variant="h4" color="error" gutterBottom>
              Something went wrong
            </Typography>

            <Typography variant="body1" color="text.secondary" paragraph>
              An unexpected error occurred. Please try refreshing the page.
            </Typography>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <Box
                sx={{
                  marginTop: 2,
                  padding: 2,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 1,
                  textAlign: "left",
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Error Details (Development):
                </Typography>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{ whiteSpace: "pre-wrap" }}
                >
                  {this.state.error.message}
                </Typography>
                {this.state.errorInfo && (
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ whiteSpace: "pre-wrap", marginTop: 1 }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Box>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={this.handleRetry}
              sx={{ marginTop: 2 }}
            >
              Try Again
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
