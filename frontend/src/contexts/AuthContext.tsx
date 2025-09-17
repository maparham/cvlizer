import React, { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from '../stores/authStore'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
  error: string | null
  clearError: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user,
    login,
    register,
    logout,
    loading,
    error,
    clearError,
    isAuthenticated,
    verifyToken
  } = useAuthStore()

  // Initialize auth state on mount
  React.useEffect(() => {
    verifyToken()
  }, [verifyToken])

  // Create wrapper functions that match the expected interface
  const loginWrapper = async (email: string, password: string) => {
    await login({ email, password })
  }

  const registerWrapper = async (email: string, password: string) => {
    await register({ email, password })
  }

  const value: AuthContextType = {
    user,
    login: loginWrapper,
    register: registerWrapper,
    logout,
    loading,
    error,
    clearError,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
