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
