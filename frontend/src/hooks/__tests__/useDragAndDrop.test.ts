import { renderHook, act } from '@testing-library/react'
import { useDragAndDrop } from '../useDragAndDrop'
import { CVSection } from '../../types'

describe('useDragAndDrop', () => {
  const mockSections: CVSection[] = [
    { id: '1', type: 'personal_info', title: 'Personal Information' },
    { id: '2', type: 'work_experience', title: 'Work Experience' },
    { id: '3', type: 'education', title: 'Education' }
  ]
  const mockOnReorderSections = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: mockSections,
      onReorderSections: mockOnReorderSections
    }))

    expect(result.current.activeId).toBeNull()
    expect(typeof result.current.handleDragStart).toBe('function')
    expect(typeof result.current.handleDragEnd).toBe('function')
  })

  it('should handle drag start', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: mockSections,
      onReorderSections: mockOnReorderSections
    }))

    const mockEvent = {
      active: { id: '1' }
    } as any

    act(() => {
      result.current.handleDragStart(mockEvent)
    })

    expect(result.current.activeId).toBe('1')
  })

  it('should handle drag end with reordering', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: mockSections,
      onReorderSections: mockOnReorderSections
    }))

    const mockEvent = {
      active: { id: '1' },
      over: { id: '3' }
    } as any

    act(() => {
      result.current.handleDragEnd(mockEvent)
    })

    expect(mockOnReorderSections).toHaveBeenCalledWith([
      { id: '2', type: 'work_experience', title: 'Work Experience' },
      { id: '3', type: 'education', title: 'Education' },
      { id: '1', type: 'personal_info', title: 'Personal Information' }
    ])
    expect(result.current.activeId).toBeNull()
  })

  it('should handle drag end without reordering', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: mockSections,
      onReorderSections: mockOnReorderSections
    }))

    const mockEvent = {
      active: { id: '1' },
      over: { id: '1' }
    } as any

    act(() => {
      result.current.handleDragEnd(mockEvent)
    })

    expect(mockOnReorderSections).not.toHaveBeenCalled()
    expect(result.current.activeId).toBeNull()
  })

  it('should handle drag end with no over target', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: mockSections,
      onReorderSections: mockOnReorderSections
    }))

    const mockEvent = {
      active: { id: '1' },
      over: null
    } as any

    act(() => {
      result.current.handleDragEnd(mockEvent)
    })

    // When over is null, it should still call onReorderSections with the original array
    expect(mockOnReorderSections).toHaveBeenCalled()
    expect(result.current.activeId).toBeNull()
  })

  it('should update activeId on multiple drag starts', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: mockSections,
      onReorderSections: mockOnReorderSections
    }))

    // First drag start
    act(() => {
      result.current.handleDragStart({ active: { id: '1' } } as any)
    })
    expect(result.current.activeId).toBe('1')

    // Second drag start
    act(() => {
      result.current.handleDragStart({ active: { id: '2' } } as any)
    })
    expect(result.current.activeId).toBe('2')
  })

  it('should reset activeId after drag end', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: mockSections,
      onReorderSections: mockOnReorderSections
    }))

    // Start drag
    act(() => {
      result.current.handleDragStart({ active: { id: '1' } } as any)
    })
    expect(result.current.activeId).toBe('1')

    // End drag
    act(() => {
      result.current.handleDragEnd({ active: { id: '1' }, over: { id: '2' } } as any)
    })
    expect(result.current.activeId).toBeNull()
  })

  it('should handle reordering with different indices', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: mockSections,
      onReorderSections: mockOnReorderSections
    }))

    // Move first item to last position
    const mockEvent = {
      active: { id: '1' },
      over: { id: '3' }
    } as any

    act(() => {
      result.current.handleDragEnd(mockEvent)
    })

    expect(mockOnReorderSections).toHaveBeenCalledWith([
      { id: '2', type: 'work_experience', title: 'Work Experience' },
      { id: '3', type: 'education', title: 'Education' },
      { id: '1', type: 'personal_info', title: 'Personal Information' }
    ])
  })

  it('should handle reordering with middle item', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: mockSections,
      onReorderSections: mockOnReorderSections
    }))

    // Move middle item to first position
    const mockEvent = {
      active: { id: '2' },
      over: { id: '1' }
    } as any

    act(() => {
      result.current.handleDragEnd(mockEvent)
    })

    expect(mockOnReorderSections).toHaveBeenCalledWith([
      { id: '2', type: 'work_experience', title: 'Work Experience' },
      { id: '1', type: 'personal_info', title: 'Personal Information' },
      { id: '3', type: 'education', title: 'Education' }
    ])
  })

  it('should work with empty sections array', () => {
    const { result } = renderHook(() => useDragAndDrop({
      sections: [],
      onReorderSections: mockOnReorderSections
    }))

    const mockEvent = {
      active: { id: '1' },
      over: { id: '2' }
    } as any

    act(() => {
      result.current.handleDragEnd(mockEvent)
    })

    // With empty array, findIndex returns -1, so arrayMove will still be called
    expect(mockOnReorderSections).toHaveBeenCalled()
  })

  it('should handle sections with same id', () => {
    const duplicateSections: CVSection[] = [
      { id: '1', type: 'personal_info', title: 'Personal Information' },
      { id: '1', type: 'work_experience', title: 'Work Experience' }
    ]

    const { result } = renderHook(() => useDragAndDrop({
      sections: duplicateSections,
      onReorderSections: mockOnReorderSections
    }))

    const mockEvent = {
      active: { id: '1' },
      over: { id: '1' }
    } as any

    act(() => {
      result.current.handleDragEnd(mockEvent)
    })

    // Should not reorder when indices are the same
    expect(mockOnReorderSections).not.toHaveBeenCalled()
  })
})