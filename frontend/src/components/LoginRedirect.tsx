/**
 * Login Redirect Component
 * 
 * This module handles automatic redirection after successful login based on user role.
 * It determines whether to redirect users to the regular dashboard or admin dashboard
 * based on their admin status.
 * 
 * Key responsibilities:
 * - Check user authentication status and admin role
 * - Redirect admins to /admin dashboard
 * - Redirect regular users to /dashboard
 * - Show loading state during redirection
 * - Handle edge cases and errors gracefully
 * 
 * Usage:
 * - Used as a redirect target after successful Clerk authentication
 * - Automatically determines the appropriate dashboard based on user role
 * - Provides consistent post-login experience
 */
import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Box, CircularProgress, Typography } from '@mui/material'

const LoginRedirect: React.FC = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const [redirectPath, setRedirectPath] = useState<string | null>(null)


  // Determine redirect path when authentication state is ready
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        setRedirectPath('/login')
      } else if (isAdmin) {
        setRedirectPath('/admin')
      } else {
        setRedirectPath('/dashboard')
      }
    }
  }, [isAuthenticated, isAdmin, loading])

  // Show loading while authentication is being determined
  if (loading || !redirectPath) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Determining your access level...
        </Typography>
      </Box>
    )
  }

  // Redirect to the determined path
  return <Navigate to={redirectPath} replace />
}

export default LoginRedirect
