/**
 * Date utility functions for CV editor
 */
import dayjs, { Dayjs } from 'dayjs'

/**
 * Formats a Date object or Dayjs object for backend storage (always YYYY-MM-DD format)
 * @param date - The Date or Dayjs object to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export const formatDateForBackend = (date: Date | Dayjs): string => {
  if (dayjs.isDayjs(date)) {
    return date.format('YYYY-MM-DD')
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formats a date string for display (only supports YYYY-MM-DD format)
 * @param dateString - The date string to format
 * @returns Formatted date string for display
 */
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return ''
  
  // Only support YYYY-MM-DD format
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString
  }
  
  // Return original if format is unknown
  return dateString
}

/**
 * Converts a date string to a Date object for DatePicker components (legacy)
 * @param dateString - The date string to convert
 * @returns Date object or null if invalid
 */
export const parseDateForPicker = (dateString: string): Date | null => {
  if (!dateString) return null
  
  try {
    // Handle YYYY-MM format by adding first day of month
    const formattedDate = formatDateForDisplay(dateString)
    const date = new Date(formattedDate)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null
    }
    
    return date
  } catch (error) {
    return null
  }
}

/**
 * Converts a date string to a Dayjs object for DateField components
 * @param dateString - The date string to convert
 * @returns Dayjs object or null if invalid
 */
export const parseDateForDateField = (dateString: string): Dayjs | null => {
  if (!dateString) return null
  
  try {
    const date = dayjs(dateString)
    
    // Check if date is valid
    if (!date.isValid()) {
      return null
    }
    
    return date
  } catch (error) {
    return null
  }
}
