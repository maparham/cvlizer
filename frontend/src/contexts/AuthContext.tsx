import React, { createContext, useContext, ReactNode } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'

interface AuthContextType {
  user: any | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
  error: string | null
  clearError: () => void
  isAuthenticated: boolean
}

interface AuthProviderProps {
  children: ReactNode
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  // For Clerk, login/register are handled by the UI components
  // These are kept for compatibility but will redirect to Clerk pages
  const login = async (email: string, password: string) => {
    // Redirect to login page - Clerk handles the actual authentication
    window.location.href = '/login'
  }

  const register = async (email: string, password: string) => {
    // Redirect to register page - Clerk handles the actual authentication
    window.location.href = '/register'
  }

  const logout = () => {
    signOut()
  }

  const clearError = () => {
    // No-op for now since Clerk handles errors
  }

  const value: AuthContextType = {
    user: user ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || '',
      is_active: true,
      email_verified: user.primaryEmailAddress?.verification?.status === 'verified',
      created_at: user.createdAt?.toISOString() || '',
      updated_at: user.updatedAt?.toISOString() || ''
    } : null,
    login,
    register,
    logout,
    loading: !isLoaded,
    error: null, // Clerk handles errors through its own UI
    clearError,
    isAuthenticated: !!user && isLoaded
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}