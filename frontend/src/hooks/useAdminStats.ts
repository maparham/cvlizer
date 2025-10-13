/**
 * useAdminStats - Custom hook for managing admin statistics
 *
 * This hook handles loading and managing system statistics for the admin dashboard.
 * Provides loading state, error handling, and data refresh functionality.
 *
 * Key responsibilities:
 * - Load system statistics from API
 * - Manage loading and error states
 * - Provide refresh functionality
 * - Handle authentication and navigation
 *
 * Usage context:
 * - Used in admin dashboard overview tab
 * - Integrates with admin API endpoints
 * - Provides consistent error handling
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { SystemStats } from '../types/admin'

interface UseAdminStatsReturn {
  stats: SystemStats | null
  loading: boolean
  error: string | null
  loadStats: () => Promise<void>
}

export const useAdminStats = (): UseAdminStatsReturn => {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/stats')
      setStats(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    loadStats()
  }, [isAuthenticated, navigate])

  return {
    stats,
    loading,
    error,
    loadStats
  }
}
