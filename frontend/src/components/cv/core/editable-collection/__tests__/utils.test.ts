/**
 * Unit tests for editable-collection utilities
 */
import {
  getSectionId,
  getSingularTitle,
  parseDate,
  sortItemsByDate,
  reorderItems,
  moveItemUp,
  moveItemDown
} from '../utils'

describe('editable-collection utils', () => {
  describe('getSectionId', () => {
    it('should return correct section ID for known titles', () => {
      expect(getSectionId('Work Experience')).toBe('work_experience')
      expect(getSectionId('Education')).toBe('education')
      expect(getSectionId('Projects')).toBe('projects')
      expect(getSectionId('Awards & Recognition')).toBe('awards')
      expect(getSectionId('Certifications')).toBe('certifications')
    })

    it('should return lowercase with underscores for unknown titles', () => {
      expect(getSectionId('Custom Section')).toBe('custom_section')
      expect(getSectionId('Another Test')).toBe('another_test')
    })
  })

  describe('getSingularTitle', () => {
    it('should return correct singular form for known titles', () => {
      expect(getSingularTitle('Projects')).toBe('Project')
      expect(getSingularTitle('Awards')).toBe('Award')
      expect(getSingularTitle('Certifications')).toBe('Certification')
      expect(getSingularTitle('Publications')).toBe('Publication')
    })

    it('should return same title for already singular forms', () => {
      expect(getSingularTitle('Work Experience')).toBe('Work Experience')
      expect(getSingularTitle('Education')).toBe('Education')
    })

    it('should remove last character for unknown plural titles', () => {
      expect(getSingularTitle('Items')).toBe('Item')
      expect(getSingularTitle('Things')).toBe('Thing')
    })
  })

  describe('parseDate', () => {
    it('should parse full date format (YYYY-MM-DD)', () => {
      const result = parseDate('2023-05-15')
      expect(result.getFullYear()).toBe(2023)
      expect(result.getMonth()).toBe(4) // 0-indexed
      expect(result.getDate()).toBe(15)
    })

    it('should parse year-month format (YYYY-MM)', () => {
      const result = parseDate('2023-05')
      expect(result.getFullYear()).toBe(2023)
      expect(result.getMonth()).toBe(4) // 0-indexed
      expect(result.getDate()).toBe(1) // defaults to 1st
    })

    it('should parse year format (YYYY)', () => {
      const result = parseDate('2023')
      expect(result.getFullYear()).toBe(2023)
      expect(result.getMonth()).toBe(0) // January
      expect(result.getDate()).toBe(1)
    })

    it('should return epoch for empty string', () => {
      const result = parseDate('')
      expect(result.getTime()).toBe(0)
    })

    it('should handle dates with extra characters', () => {
      const result = parseDate('2023-05-15 (Present)')
      expect(result.getFullYear()).toBe(2023)
      expect(result.getMonth()).toBe(4)
      expect(result.getDate()).toBe(15)
    })

    it('should return epoch for invalid dates', () => {
      const result = parseDate('invalid-date')
      expect(result.getTime()).toBe(0)
    })
  })

  describe('sortItemsByDate', () => {
    const mockItems = [
      { name: 'Item 1', date: '2023-01-15' },
      { name: 'Item 2', date: '2022-06-10' },
      { name: 'Item 3', date: '2023-12-01' },
      { name: 'Item 4', date: '' } // empty date
    ]

    it('should sort items in ascending order', () => {
      const result = sortItemsByDate(mockItems, 'date', 'asc')
      
      expect(result[0].name).toBe('Item 4') // empty date (epoch) comes first
      expect(result[1].name).toBe('Item 2') // 2022-06-10
      expect(result[2].name).toBe('Item 1') // 2023-01-15
      expect(result[3].name).toBe('Item 3') // 2023-12-01
    })

    it('should sort items in descending order', () => {
      const result = sortItemsByDate(mockItems, 'date', 'desc')
      
      expect(result[0].name).toBe('Item 3') // 2023-12-01
      expect(result[1].name).toBe('Item 1') // 2023-01-15
      expect(result[2].name).toBe('Item 2') // 2022-06-10
      expect(result[3].name).toBe('Item 4') // empty date comes last
    })

    it('should not modify original array', () => {
      const originalLength = mockItems.length
      const originalFirstItem = mockItems[0].name
      
      sortItemsByDate(mockItems, 'date', 'asc')
      
      expect(mockItems.length).toBe(originalLength)
      expect(mockItems[0].name).toBe(originalFirstItem)
    })
  })

  describe('reorderItems', () => {
    const mockItems = ['A', 'B', 'C', 'D', 'E']

    it('should move item from beginning to end', () => {
      const result = reorderItems(mockItems, 0, 4)
      expect(result).toEqual(['B', 'C', 'D', 'E', 'A'])
    })

    it('should move item from end to beginning', () => {
      const result = reorderItems(mockItems, 4, 0)
      expect(result).toEqual(['E', 'A', 'B', 'C', 'D'])
    })

    it('should move item down by one position', () => {
      const result = reorderItems(mockItems, 1, 2)
      expect(result).toEqual(['A', 'C', 'B', 'D', 'E'])
    })

    it('should move item up by one position', () => {
      const result = reorderItems(mockItems, 2, 1)
      expect(result).toEqual(['A', 'C', 'B', 'D', 'E'])
    })

    it('should return same array when source and destination are the same', () => {
      const result = reorderItems(mockItems, 2, 2)
      expect(result).toEqual(mockItems)
    })

    it('should not modify original array', () => {
      const originalLength = mockItems.length
      const originalFirstItem = mockItems[0]
      
      reorderItems(mockItems, 0, 4)
      
      expect(mockItems.length).toBe(originalLength)
      expect(mockItems[0]).toBe(originalFirstItem)
    })
  })

  describe('moveItemUp', () => {
    const mockItems = ['A', 'B', 'C', 'D']

    it('should move item up by one position', () => {
      const result = moveItemUp(mockItems, 2)
      expect(result).toEqual(['A', 'C', 'B', 'D'])
    })

    it('should return same array when trying to move first item up', () => {
      const result = moveItemUp(mockItems, 0)
      expect(result).toEqual(mockItems)
    })

    it('should move last item to second-to-last position', () => {
      const result = moveItemUp(mockItems, 3)
      expect(result).toEqual(['A', 'B', 'D', 'C'])
    })

    it('should not modify original array', () => {
      const originalLength = mockItems.length
      const originalFirstItem = mockItems[0]
      
      moveItemUp(mockItems, 2)
      
      expect(mockItems.length).toBe(originalLength)
      expect(mockItems[0]).toBe(originalFirstItem)
    })
  })

  describe('moveItemDown', () => {
    const mockItems = ['A', 'B', 'C', 'D']

    it('should move item down by one position', () => {
      const result = moveItemDown(mockItems, 1)
      expect(result).toEqual(['A', 'C', 'B', 'D'])
    })

    it('should return same array when trying to move last item down', () => {
      const result = moveItemDown(mockItems, 3)
      expect(result).toEqual(mockItems)
    })

    it('should move first item to second position', () => {
      const result = moveItemDown(mockItems, 0)
      expect(result).toEqual(['B', 'A', 'C', 'D'])
    })

    it('should not modify original array', () => {
      const originalLength = mockItems.length
      const originalFirstItem = mockItems[0]
      
      moveItemDown(mockItems, 1)
      
      expect(mockItems.length).toBe(originalLength)
      expect(mockItems[0]).toBe(originalFirstItem)
    })
  })
})
