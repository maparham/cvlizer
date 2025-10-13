/**
 * Protected Route Component
 *
 * This module provides route protection for authenticated users using the custom AuthContext.
 * It ensures only signed-in users can access protected pages and redirects unauthenticated
 * users to the login page.
 *
 * Key responsibilities:
 * - Check user authentication status using AuthContext
 * - Show loading state while authentication is being verified
 * - Redirect unauthenticated users to login page
 * - Render protected content for authenticated users
 *
 * Usage:
 * - Wrap protected routes with this component
 * - Automatically handles authentication state management
 * - Provides consistent loading and redirect behavior
 */
import React from 'react'
import { Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  try {
    const authContext = useAuth()
    const { isAuthenticated, loading } = authContext

    // Show loading spinner while authentication is loading
    if (loading) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      )
    }

    // Allow access if user is authenticated
    if (isAuthenticated) {
      return <>{children}</>
    }

    // Redirect to login if user is not authenticated
    return <Navigate to="/login" replace />
  } catch (error) {
    console.error('ProtectedRoute error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    // Fallback to showing loading spinner if there's an error
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }
}

export default ProtectedRoute
