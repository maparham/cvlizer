/**
 * Unit tests for editable-collection hooks
 */
import { renderHook, act } from '@testing-library/react'
import { useItemEditing, useSorting, useItemsData, useReordering } from '../hooks'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

// Mock localStorage properly for Jest environment
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

describe('editable-collection hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useItemEditing', () => {
    const mockProps = {
      title: 'Test Section',
      onUnsavedChanges: jest.fn(),
      unregisterIndividualItemEditing: jest.fn(),
      onClose: jest.fn()
    }

    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useItemEditing(
        mockProps.title,
        mockProps.onUnsavedChanges,
        mockProps.unregisterIndividualItemEditing,
        mockProps.onClose
      ))

      expect(result.current.editingItemIndex).toBe(null)
      expect(result.current.editData).toBe(null)
    })

    it('should set editing item index', () => {
      const { result } = renderHook(() => useItemEditing(
        mockProps.title,
        mockProps.onUnsavedChanges,
        mockProps.unregisterIndividualItemEditing,
        mockProps.onClose
      ))

      act(() => {
        result.current.setEditingItemIndex(1)
      })

      expect(result.current.editingItemIndex).toBe(1)
    })

    it('should set edit data', () => {
      const { result } = renderHook(() => useItemEditing(
        mockProps.title,
        mockProps.onUnsavedChanges,
        mockProps.unregisterIndividualItemEditing,
        mockProps.onClose
      ))

      const testData = { name: 'Test Item' }

      act(() => {
        result.current.setEditData(testData)
      })

      expect(result.current.editData).toEqual(testData)
    })

    it('should handle cancel edit', () => {
      const { result } = renderHook(() => useItemEditing(
        mockProps.title,
        mockProps.onUnsavedChanges,
        mockProps.unregisterIndividualItemEditing,
        mockProps.onClose
      ))

      act(() => {
        result.current.setEditingItemIndex(1)
        result.current.setEditData({ name: 'Test' })
      })

      act(() => {
        result.current.handleCancelEdit()
      })

      expect(result.current.editingItemIndex).toBe(null)
      expect(result.current.editData).toBe(null)
      expect(mockProps.onUnsavedChanges).toHaveBeenCalledWith('test_section', false)
      expect(mockProps.unregisterIndividualItemEditing).toHaveBeenCalled()
      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('should not call onClose when canceling during save', () => {
      const { result } = renderHook(() => useItemEditing(
        mockProps.title,
        mockProps.onUnsavedChanges,
        mockProps.unregisterIndividualItemEditing,
        mockProps.onClose
      ))

      act(() => {
        result.current.handleCancelEdit(true) // isSave = true
      })

      expect(mockProps.onClose).not.toHaveBeenCalled()
    })

    it('should update item and track unsaved changes', () => {
      const { result } = renderHook(() => useItemEditing(
        mockProps.title,
        mockProps.onUnsavedChanges,
        mockProps.unregisterIndividualItemEditing,
        mockProps.onClose
      ))

      const initialData = { name: 'Initial', description: 'Test' }
      const itemsData = [initialData]

      act(() => {
        result.current.setEditingItemIndex(0)
        result.current.setEditData(initialData)
      })

      act(() => {
        result.current.handleUpdateItem('name' as never, 'Updated', itemsData)
      })

      expect(result.current.editData).toEqual({ name: 'Updated', description: 'Test' })
      expect(mockProps.onUnsavedChanges).toHaveBeenCalledWith('test_section', true)
    })
  })

  describe('useSorting', () => {
    const mockData = [
      { name: 'Item 1', date: '2023-01-01' },
      { name: 'Item 2', date: '2022-01-01' }
    ]

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null)
    })

    it('should initialize with default values', () => {
      const { result } = renderHook(() => useSorting('Test Section', mockData, false))

      expect(result.current.sortField).toBe('')
      expect(result.current.sortDirection).toBe('desc')
    })

    it('should load sort preferences from localStorage', () => {
      localStorageMock.getItem
        .mockReturnValueOnce('date') // sortField
        .mockReturnValueOnce('asc')  // sortDirection

      const { result } = renderHook(() => useSorting('Test Section', mockData, false))

      expect(result.current.sortField).toBe('date')
      expect(result.current.sortDirection).toBe('asc')
    })

    it('should handle sort field and direction changes', () => {
      const { result } = renderHook(() => useSorting('Test Section', mockData, false))

      act(() => {
        result.current.handleSort('date', 'asc')
      })

      expect(result.current.sortField).toBe('date')
      expect(result.current.sortDirection).toBe('asc')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('cv_sort_test_section_field', 'date')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('cv_sort_test_section_direction', 'asc')
    })

    it('should clear sort settings', () => {
      const { result } = renderHook(() => useSorting('Test Section', mockData, false))

      act(() => {
        result.current.handleSort('date', 'asc')
      })

      act(() => {
        result.current.clearSort()
      })

      expect(result.current.sortField).toBe('')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cv_sort_test_section_field')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cv_sort_test_section_direction')
    })
  })

  describe('useItemsData', () => {
    const mockData = [
      { name: 'Item 1', date: '2023-01-01' },
      { name: 'Item 2', date: '2022-01-01' },
      { name: 'Item 3', date: '2023-06-01' }
    ]

    it('should initialize with provided data', () => {
      const { result } = renderHook(() => useItemsData(mockData, '', 'desc', false))

      expect(result.current.itemsData).toEqual(mockData)
    })

    it('should sort data when sort field is provided', () => {
      const { result } = renderHook(() => useItemsData(mockData, 'date', 'desc', false))

      // Should be sorted by date descending: 2023-06-01, 2023-01-01, 2022-01-01
      expect(result.current.itemsData[0].name).toBe('Item 3')
      expect(result.current.itemsData[1].name).toBe('Item 1')
      expect(result.current.itemsData[2].name).toBe('Item 2')
    })

    it('should not sort data when reordering', () => {
      const { result } = renderHook(() => useItemsData(mockData, 'date', 'desc', true))

      // Should maintain original order when reordering
      expect(result.current.itemsData).toEqual(mockData)
    })

    it('should update items data', () => {
      const { result } = renderHook(() => useItemsData(mockData, '', 'desc', false))

      const newData = [{ name: 'New Item', date: '2024-01-01' }]

      act(() => {
        result.current.setItemsData(newData)
      })

      expect(result.current.itemsData).toEqual(newData)
    })
  })

  describe('useReordering', () => {
    it('should initialize with isReordering as false', () => {
      const { result } = renderHook(() => useReordering())

      expect(result.current.isReordering).toBe(false)
    })

    it('should handle drag start', () => {
      const { result } = renderHook(() => useReordering())

      act(() => {
        result.current.handleDragStart()
      })

      expect(result.current.isReordering).toBe(true)
    })

    it('should handle drag end', async () => {
      const { result } = renderHook(() => useReordering())

      act(() => {
        result.current.handleDragStart()
      })

      expect(result.current.isReordering).toBe(true)

      act(() => {
        result.current.handleDragEnd()
      })

      // Wait for the setTimeout to complete
      act(() => {
        jest.advanceTimersByTime(50)
      })

      expect(result.current.isReordering).toBe(false)
    })

    it('should handle manual reorder', () => {
      const { result } = renderHook(() => useReordering())

      act(() => {
        result.current.handleManualReorder()
      })

      expect(result.current.isReordering).toBe(true)

      // Should automatically reset after timeout
      act(() => {
        jest.advanceTimersByTime(50)
      })

      expect(result.current.isReordering).toBe(false)
    })
  })
})

// Setup for timer mocks
jest.useFakeTimers()
