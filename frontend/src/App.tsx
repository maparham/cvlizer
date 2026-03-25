/**
 * Main Application Component
 *
 * This module sets up the core application structure including:
 * - React Router for client-side routing
 * - Material-UI theme provider and styling
 * - Authentication context provider
 * - Lazy loading for code splitting and performance optimization
 * - Global loading states and error boundaries
 */
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Suspense, lazy, useCallback, useEffect } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { AITaskPollingProvider } from "./contexts/AITaskPollingContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ErrorBoundary, ImpersonationBanner } from "./components/common";
import { useCVStore } from "./stores/cv";
import { useImpersonation } from "./hooks/useImpersonation";
import { useActivityLogger } from "./hooks/useActivityLogger";
import { unlockAudio } from "./utils/audioNotification";
import { clearTitleNotification } from "./utils/titleNotification";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const CVEditor = lazy(() => import("./pages/CVEditor"));
const ExportPage = lazy(() => import("./pages/ExportPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const JobLibrary = lazy(() => import("./pages/JobLibrary"));
const QuickStart = lazy(() => import("./pages/QuickStart"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LoginRedirect = lazy(() => import("./components/LoginRedirect"));
const Legal = lazy(() => import("./pages/Legal"));
const Feedback = lazy(() => import("./pages/Feedback"));

// Loading component
const PageLoader = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress />
  </Box>
);

// Inner app component that can use hooks
const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchCVs } = useCVStore();
  useImpersonation(); // For side effects only
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { logPageView } = useActivityLogger();

  // Log page views when route changes
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      logPageView(location.pathname);
    }
  }, [location.pathname, isAuthenticated, authLoading, logPageView]);

  // Unlock audio on first user interaction (required by browser autoplay policies)
  useEffect(() => {
    unlockAudio();
  }, []);

  // Clear title notification when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to tab, clear title notification
        clearTitleNotification();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleImpersonationEnd = useCallback(async () => {
    // Only refresh CV data if authenticated
    if (isAuthenticated && !authLoading) {
      await fetchCVs();
    }

    // Only redirect to admin if we're not already on an admin page
    // This prevents redirecting away from the current page when impersonation ends
    if (!location.pathname.startsWith("/admin")) {
      navigate("/admin?tab=users");
    }
  }, [fetchCVs, navigate, isAuthenticated, authLoading, location.pathname]);

  return (
    <ErrorBoundary>
      {/* Impersonation banner - shows when admin is impersonating */}
      <ImpersonationBanner onImpersonationEnd={handleImpersonationEnd} />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/quick-start" element={<QuickStart />} />
          <Route path="/legal" element={<Legal />} />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Feedback />
              </ProtectedRoute>
            }
          />
          {/* Clerk email verification routes */}
          <Route path="/register/verify" element={<LoginRedirect />} />
          <Route path="/sign-in/verify" element={<LoginRedirect />} />
          <Route path="/login-redirect" element={<LoginRedirect />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <JobLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cv/:cvId"
            element={
              <ProtectedRoute>
                <CVEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cv/new"
            element={
              <ProtectedRoute>
                <CVEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cv/:cvId/export"
            element={
              <ProtectedRoute>
                <ExportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#81c784",
    },
    secondary: {
      main: "#dc004e",
    },
    info: {
      main: "#81c784",
      light: "#a5d6a7",
      dark: "#66bb6a",
      contrastText: "#ffffff",
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <ImpersonationProvider>
            <AITaskPollingProvider>
              <Router
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <AppContent />
              </Router>
            </AITaskPollingProvider>
          </ImpersonationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
