/**
 * Admin AI Usage API service.
 * 
 * This module provides API functions for fetching AI usage data
 * from the admin endpoints, including statistics, user breakdowns,
 * and detailed logs.
 */
import api from './api'
import {
  SystemAIStats,
  UserAIUsage,
  OperationAIUsage,
  TimelineData,
  PaginatedAIUsageLogs,
  AIUsageFilters
} from '../types/admin'

/**
 * Get comprehensive AI usage statistics.
 */
export const getAIUsageStats = async (
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<SystemAIStats> => {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  if (userId) params.append('user_id', userId)

  const response = await api.get(`/admin/ai-usage/stats?${params.toString()}`)
  return response.data
}

/**
 * Get AI usage statistics grouped by user.
 */
export const getAIUsageByUser = async (
  startDate?: string,
  endDate?: string,
  limit: number = 50,
  offset: number = 0
): Promise<UserAIUsage[]> => {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  params.append('limit', limit.toString())
  params.append('offset', offset.toString())

  const response = await api.get(`/admin/ai-usage/by-user?${params.toString()}`)
  return response.data
}

/**
 * Get AI usage statistics grouped by operation type.
 */
export const getAIUsageByOperation = async (
  startDate?: string,
  endDate?: string
): Promise<OperationAIUsage[]> => {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const response = await api.get(`/admin/ai-usage/by-operation?${params.toString()}`)
  return response.data
}

/**
 * Get AI usage data for timeline charts with support for hourly granularity.
 */
export const getAIUsageTimeline = async (
  startDate?: string,
  endDate?: string,
  granularity: 'day' | 'week' | 'month' | 'hour' = 'day'
): Promise<TimelineData[]> => {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  params.append('granularity', granularity)

  const response = await api.get(`/admin/ai-usage/timeline?${params.toString()}`)
  return response.data
}

/**
 * Get detailed AI usage logs with filtering and pagination.
 */
export const getAIUsageLogs = async (
  filters: AIUsageFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedAIUsageLogs> => {
  const params = new URLSearchParams()
  
  if (filters.start_date) params.append('start_date', filters.start_date)
  if (filters.end_date) params.append('end_date', filters.end_date)
  if (filters.user_id) params.append('user_id', filters.user_id)
  if (filters.operation_type) params.append('operation_type', filters.operation_type)
  if (filters.success !== undefined) params.append('success', filters.success.toString())
  
  params.append('limit', limit.toString())
  params.append('offset', offset.toString())

  const response = await api.get(`/admin/ai-usage/logs?${params.toString()}`)
  return response.data
}

/**
 * Get available operation types for filtering.
 */
export const getOperationTypes = (): string[] => {
  return [
    'parse_cv',
    'generate_section',
    'job_fit_analysis',
    'enhance_content',
    'ats_optimization',
    'generate_suggestions',
    'extract_job_description'
  ]
}

/**
 * Format operation type for display.
 */
export const formatOperationType = (operationType: string): string => {
  const typeMap: Record<string, string> = {
    'parse_cv': 'Parse CV',
    'generate_section': 'Generate Section',
    'job_fit_analysis': 'Job Fit Analysis',
    'enhance_content': 'Enhance Content',
    'ats_optimization': 'ATS Optimization',
    'generate_suggestions': 'Generate Suggestions',
    'extract_job_description': 'Extract Job Description'
  }
  
  return typeMap[operationType] || operationType
}

/**
 * Get default date range (last 30 days).
 */
export const getDefaultDateRange = (): { start: string; end: string } => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}
