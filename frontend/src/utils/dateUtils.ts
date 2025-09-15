/**
 * Date utility functions for CV editor
 */

/**
 * Formats a Date object for backend storage (always YYYY-MM-DD format)
 * @param date - The Date object to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export const formatDateForBackend = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formats a date string for display (handles both YYYY-MM-DD and YYYY-MM formats)
 * @param dateString - The date string to format
 * @returns Formatted date string for display
 */
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return ''
  
  // If it's already in YYYY-MM-DD format, return as is
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString
  }
  
  // If it's in YYYY-MM format, add the first day of the month
  if (dateString.match(/^\d{4}-\d{2}$/)) {
    return `${dateString}-01`
  }
  
  // Return original if format is unknown
  return dateString
}

/**
 * Converts a date string to a Date object for DatePicker components
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
