/**
 * useAdminUsers - Custom hook for managing admin user data
 * 
 * This hook handles loading, filtering, and managing user data for the admin dashboard.
 * Provides search functionality, filtering options, and user management actions.
 * 
 * Key responsibilities:
 * - Load and filter users from API
 * - Manage search and filter state
 * - Handle user CRUD operations
 * - Provide loading and error states
 * 
 * Usage context:
 * - Used in admin dashboard users tab
 * - Integrates with admin API endpoints
 * - Supports real-time filtering and search
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { UserSummary } from '../types/admin'

interface UserFilters {
  searchTerm: string
  clerkFilter: string
  activeFilter: string
}

interface UseAdminUsersReturn {
  users: UserSummary[]
  loading: boolean
  error: string | null
  filters: UserFilters
  setFilters: (filters: Partial<UserFilters>) => void
  loadUsers: () => Promise<void>
  toggleUserActive: (userId: string, currentStatus: boolean) => Promise<void>
}

export const useAdminUsers = (): UseAdminUsersReturn => {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<UserFilters>({
    searchTerm: '',
    clerkFilter: 'all',
    activeFilter: 'all'
  })
  
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.searchTerm) params.append('search', filters.searchTerm)
      if (filters.clerkFilter !== 'all') params.append('clerk_only', filters.clerkFilter === 'clerk' ? 'true' : 'false')
      if (filters.activeFilter !== 'all') params.append('active_only', filters.activeFilter === 'active' ? 'true' : 'false')
      
      const response = await api.get(`/admin/users?${params}`)
      setUsers(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-active`)
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_active: !currentStatus }
          : user
      ))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user status')
      throw err
    }
  }

  const setFilters = (newFilters: Partial<UserFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers()
    }
  }, [isAuthenticated, filters])

  return {
    users,
    loading,
    error,
    filters,
    setFilters,
    loadUsers,
    toggleUserActive
  }
}
