/**
 * Protected Route Component
 * 
 * This module provides route protection for authenticated users using Clerk authentication.
 * It ensures only signed-in users can access protected pages and redirects unauthenticated
 * users to the login page.
 * 
 * Key responsibilities:
 * - Check user authentication status using Clerk
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
import { useUser } from '@clerk/clerk-react'
import { Box, CircularProgress } from '@mui/material'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser()

  // Show loading spinner while Clerk is loading
  if (!isLoaded) {
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

  // Redirect to login if user is not signed in
  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  // Render the protected component if user is authenticated
  return <>{children}</>
}

export default ProtectedRoute
