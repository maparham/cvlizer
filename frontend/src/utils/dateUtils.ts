/**
 * Date Utilities
 *
 * This module provides date formatting and manipulation utilities specifically designed
 * for the CV editor. It handles date formatting for backend storage and user display.
 *
 * Key responsibilities:
 * - Format dates for backend storage (YYYY-MM-DD format)
 * - Parse dates from various formats
 * - Provide date validation utilities
 * - Handle date comparisons and calculations
 *
 * Usage:
 * - Use formatDateForBackend() when saving dates to the backend
 * - Use parseDateFromBackend() when loading dates from the backend
 * - Import date validation functions for form validation
 */
import dayjs, { Dayjs } from "dayjs";

/**
 * Formats a Date object or Dayjs object for backend storage (always YYYY-MM-DD format)
 * @param date - The Date or Dayjs object to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export const formatDateForBackend = (date: Date | Dayjs): string => {
  if (dayjs.isDayjs(date)) {
    return date.format("YYYY-MM-DD");
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date string for display (only supports YYYY-MM-DD format)
 * @param dateString - The date string to format
 * @returns Formatted date string for display
 */
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return "";

  // Only support YYYY-MM-DD format
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }

  // Return original if format is unknown
  return dateString;
};

export type DateDisplayPrecision = 'year' | 'year-month' | 'full';
export type DateDisplayFormat = 'numeric' | 'text';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Formats a stored CV date string for display based on precision and format preferences.
 *
 * Supported input formats:
 *   YYYY-MM-DD  — full date (parsed CV or date picker)
 *   YYYY-MM     — month+year (parsed CV)
 *   Mon YYYY    — short month name + year (e.g. "Jun 2025", parsed CV)
 *   YYYY        — year only (e.g. "2010", parsed CV)
 *
 * Precision/format only applied when the input has enough information:
 *   "Mon YYYY" and "YYYY-MM" have no day → "full" precision falls back to year-month.
 *   "YYYY" has no month → precision and format are ignored, year is always returned.
 *
 * Treats null precision/format the same as undefined (backend stores null for unset).
 */
export const formatCVItemDate = (
  dateString: string,
  precision?: DateDisplayPrecision | null,
  format?: DateDisplayFormat | null
): string => {
  if (!dateString) return '';

  const p = precision ?? 'year-month';
  const f = format ?? 'text';

  // YYYY-MM-DD
  const fullMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  // YYYY-MM
  const monthMatch = dateString.match(/^(\d{4})-(\d{2})$/);
  // Mon YYYY (e.g. "Jun 2025")
  const shortMonthMatch = dateString.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  // YYYY (e.g. "2010")
  const yearOnlyMatch = dateString.match(/^(\d{4})$/);

  if (shortMonthMatch) {
    const monthIndex = MONTHS_SHORT.findIndex(m => m.toLowerCase() === shortMonthMatch[1].toLowerCase());
    if (monthIndex !== -1) {
      const year = parseInt(shortMonthMatch[2]);
      const month = monthIndex + 1;
      if (p === 'year') return String(year);
      // year-month or full (no day available, fall back to year-month)
      return f === 'numeric'
        ? `${String(month).padStart(2, '0')}.${year}`
        : `${MONTHS_SHORT[monthIndex]} ${year}`;
    }
  }

  if (yearOnlyMatch) {
    // No month/day available — return year regardless of precision
    return String(parseInt(yearOnlyMatch[1]));
  }

  if (!fullMatch && !monthMatch) return dateString;

  const year = parseInt(fullMatch ? fullMatch[1] : monthMatch![1]);
  const month = parseInt(fullMatch ? fullMatch[2] : monthMatch![2]); // 1-12
  // YYYY-MM has no day; use 1 as placeholder only for "full" display
  const day = fullMatch ? parseInt(fullMatch[3]) : 1;

  if (p === 'year') {
    return String(year);
  }

  if (p === 'year-month' || (!fullMatch && p === 'full')) {
    // YYYY-MM with "full" precision: no day available, fall back to year-month
    return f === 'numeric'
      ? `${String(month).padStart(2, '0')}.${year}`
      : `${MONTHS_SHORT[month - 1]} ${year}`;
  }

  // full, YYYY-MM-DD only
  return f === 'numeric'
    ? `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
    : `${MONTHS_LONG[month - 1]} ${day}, ${year}`;
};

/**
 * Converts a date string to a Date object for DatePicker components (legacy)
 * @param dateString - The date string to convert
 * @returns Date object or null if invalid
 */
export const parseDateForPicker = (dateString: string): Date | null => {
  if (!dateString) return null;

  try {
    // Handle YYYY-MM format by adding first day of month
    const formattedDate = formatDateForDisplay(dateString);
    const date = new Date(formattedDate);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    return null;
  }
};

/**
 * Converts a date string to a Dayjs object for DateField components
 * @param dateString - The date string to convert
 * @returns Dayjs object or null if invalid
 */
export const parseDateForDateField = (dateString: string): Dayjs | null => {
  if (!dateString) return null;

  try {
    const date = dayjs(dateString);

    // Check if date is valid
    if (!date.isValid()) {
      return null;
    }

    return date;
  } catch (error) {
    return null;
  }
};
