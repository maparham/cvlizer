/**
 * Date formatting utilities for consistent date display across the application.
 */

import { formatDistanceToNow } from 'date-fns'

/**
 * Format date to DD.MM.YYYY format
 */
export const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  
  return `${day}.${month}.${year}`
}

/**
 * Format date and time to DD.MM.YYYY HH:MM format
 */
export const formatDateTime = (date: Date | string): string => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

/**
 * Format date and time with seconds to DD.MM.YYYY HH:MM:SS format
 */
export const formatDateTimeWithSeconds = (date: Date | string): string => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')
  
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Format relative time (keeps the existing "2 hours ago" format)
 */
export const formatRelativeTime = (date: Date | string): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

/**
 * Format date for group headers (e.g., "Monday, 18 September 2025")
 */
export const formatDateGroupHeader = (date: Date | string): string => {
  const d = new Date(date)
  
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const weekday = weekdays[d.getDay()]
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  
  return `${weekday}, ${day} ${month} ${year}`
}
