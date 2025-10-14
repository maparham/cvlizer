/**
 * Authentication Context Provider
 *
 * This module provides centralized authentication state management using Clerk.
 * It creates a React context for sharing authentication state across the application
 * and provides authentication methods for login, registration, and logout.
 *
 * Key responsibilities:
 * - Provide authentication context to the entire application
 * - Integrate with Clerk authentication service
 * - Transform Clerk user data to application-specific format
 * - Handle authentication state changes and loading states
 * - Provide authentication methods for components
 *
 * Usage:
 * - Wrap the application with AuthProvider
 * - Use useAuth hook in components to access authentication state
 * - Provides consistent authentication interface across the app
 */
import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { useUser, useClerk } from "@clerk/clerk-react";

interface AuthContextType {
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Custom hook to access authentication context
 *
 * Provides access to authentication state and methods throughout the application.
 * Must be used within an AuthProvider component to avoid runtime errors.
 *
 * @returns {AuthContextType} The authentication context containing user state and methods
 * @throws {Error} If used outside of AuthProvider component
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  try {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();

    /**
     * Initiates user login process
     *
     * Redirects the user to the login page where Clerk handles the actual authentication.
     * The email and password parameters are kept for interface compatibility but are not used
     * since Clerk manages the authentication flow independently.
     *
     * @param {string} _email - User email (unused, kept for interface compatibility)
     * @param {string} _password - User password (unused, kept for interface compatibility)
     * @returns {Promise<void>} Promise that resolves when redirect is initiated
     */
    const login = useCallback(async (_email: string, _password: string) => {
      // Redirect to login page - Clerk handles the actual authentication
      window.location.href = "/login";
    }, []);

    /**
     * Initiates user registration process
     *
     * Redirects the user to the registration page where Clerk handles the actual authentication.
     * The email and password parameters are kept for interface compatibility but are not used
     * since Clerk manages the registration flow independently.
     *
     * @param {string} _email - User email (unused, kept for interface compatibility)
     * @param {string} _password - User password (unused, kept for interface compatibility)
     * @returns {Promise<void>} Promise that resolves when redirect is initiated
     */
    const register = useCallback(async (_email: string, _password: string) => {
      // Redirect to register page - Clerk handles the actual authentication
      window.location.href = "/register";
    }, []);

    /**
     * Logs out the current user
     *
     * Uses Clerk's signOut method to terminate the current user session.
     * This will clear all authentication state and redirect the user to the sign-in page.
     *
     * @returns {void}
     */
    const logout = useCallback(() => {
      signOut();
    }, [signOut]);

    /**
     * Clears authentication errors
     *
     * Currently a no-op function since Clerk handles error management through its own UI.
     * Kept for interface compatibility and future extensibility.
     *
     * @returns {void}
     */
    const clearError = useCallback(() => {
      // No-op for now since Clerk handles errors
    }, []);

    // Check if user is admin based on email
    const isAdmin = user
      ? user.primaryEmailAddress?.emailAddress ===
        import.meta.env.VITE_ADMIN_EMAIL
      : false;

    const value: AuthContextType = useMemo(
      () => ({
        user: user
          ? {
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress || "",
              is_active: true,
              email_verified:
                user.primaryEmailAddress?.verification?.status === "verified",
              created_at: user.createdAt?.toISOString() || "",
              updated_at: user.updatedAt?.toISOString() || "",
            }
          : null,
        login,
        register,
        logout,
        loading: !isLoaded,
        error: null, // Clerk handles errors through its own UI
        clearError,
        isAuthenticated: !!user && isLoaded,
        isAdmin,
      }),
      [user, isLoaded, isAdmin, login, register, logout, clearError],
    );

    return (
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
  } catch (error) {
    console.error("AuthProvider error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    // Return a fallback provider with error state
    const errorValue: AuthContextType = {
      user: null,
      login: async () => {},
      register: async () => {},
      logout: () => {},
      loading: false,
      error: "Authentication error occurred",
      clearError: () => {},
      isAuthenticated: false,
      isAdmin: false,
    };

    return (
      <AuthContext.Provider value={errorValue}>{children}</AuthContext.Provider>
    );
  }
};
