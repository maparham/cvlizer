import {
  formatDateForBackend,
  formatDateForDisplay,
  parseDateForPicker
} from '../dateUtils'

describe('dateUtils', () => {
  const testDate = new Date('2023-06-15T10:30:00Z')
  const testDateString = '2023-06-15'
  const testDateStringMonth = '2023-06'

  describe('formatDateForBackend', () => {
    it('should format date for backend storage', () => {
      const result = formatDateForBackend(testDate)
      expect(result).toBe('2023-06-15')
    })

    it('should handle different dates', () => {
      const date = new Date('2023-12-31T12:00:00Z') // Use noon to avoid timezone issues
      const result = formatDateForBackend(date)
      expect(result).toBe('2023-12-31')
    })

    it('should handle single digit months and days', () => {
      const date = new Date('2023-01-01T00:00:00Z')
      const result = formatDateForBackend(date)
      expect(result).toBe('2023-01-01')
    })
  })

  describe('formatDateForDisplay', () => {
    it('should return YYYY-MM-DD format as is', () => {
      const result = formatDateForDisplay(testDateString)
      expect(result).toBe('2023-06-15')
    })

    it('should convert YYYY-MM format to YYYY-MM-01', () => {
      const result = formatDateForDisplay(testDateStringMonth)
      expect(result).toBe('2023-06-01')
    })

    it('should handle empty string', () => {
      const result = formatDateForDisplay('')
      expect(result).toBe('')
    })

    it('should return unknown format as is', () => {
      const result = formatDateForDisplay('invalid-format')
      expect(result).toBe('invalid-format')
    })

    it('should handle null input', () => {
      const result = formatDateForDisplay(null as any)
      expect(result).toBe('')
    })

    it('should handle undefined input', () => {
      const result = formatDateForDisplay(undefined as any)
      expect(result).toBe('')
    })
  })

  describe('parseDateForPicker', () => {
    it('should parse YYYY-MM-DD format', () => {
      const result = parseDateForPicker(testDateString)
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2023)
      expect(result?.getMonth()).toBe(5) // June is month 5 (0-indexed)
      expect(result?.getDate()).toBe(15)
    })

    it('should parse YYYY-MM format', () => {
      const result = parseDateForPicker(testDateStringMonth)
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2023)
      expect(result?.getMonth()).toBe(5) // June is month 5 (0-indexed)
      expect(result?.getDate()).toBe(1)
    })

    it('should handle empty string', () => {
      const result = parseDateForPicker('')
      expect(result).toBeNull()
    })

    it('should handle null input', () => {
      const result = parseDateForPicker(null as any)
      expect(result).toBeNull()
    })

    it('should handle undefined input', () => {
      const result = parseDateForPicker(undefined as any)
      expect(result).toBeNull()
    })

    it('should handle invalid date string', () => {
      const result = parseDateForPicker('invalid-date')
      expect(result).toBeNull()
    })

    it('should handle malformed date string', () => {
      const result = parseDateForPicker('2023-13-01') // Invalid month
      expect(result).toBeNull()
    })

    it('should handle date with time', () => {
      const result = parseDateForPicker('2023-06-15T10:30:00Z')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2023)
      expect(result?.getMonth()).toBe(5)
      expect(result?.getDate()).toBe(15)
    })

    it('should handle edge case dates', () => {
      const result = parseDateForPicker('2023-02-29') // Invalid leap year date
      // JavaScript Date constructor handles invalid dates by rolling over to next month
      expect(result).toBeInstanceOf(Date)
      expect(result?.getMonth()).toBe(2) // March (0-indexed)
      expect(result?.getDate()).toBe(1)
    })

    it('should handle valid leap year date', () => {
      const result = parseDateForPicker('2024-02-29') // Valid leap year date
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
      expect(result?.getMonth()).toBe(1) // February is month 1 (0-indexed)
      expect(result?.getDate()).toBe(29)
    })
  })
})