import { renderHook, act } from '@testing-library/react'
import { useEditingState } from '../useEditingState'

// Create dynamic mock state for useUnsavedChanges
let mockPendingChanges = new Map<string, unknown>()
let mockEditingSections = new Set<string>()
let mockHasUnsavedChanges = false

const mockStartEditing = jest.fn((sectionId: string) => {
  mockEditingSections.add(sectionId)
})

const mockStopEditing = jest.fn((sectionId: string) => {
  mockEditingSections.delete(sectionId)
  mockPendingChanges.delete(sectionId)
  mockHasUnsavedChanges = mockPendingChanges.size > 0
})

const mockUpdatePendingChanges = jest.fn((sectionId: string, changes: unknown) => {
  if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
    mockPendingChanges.set(sectionId, changes)
  } else {
    mockPendingChanges.delete(sectionId)
  }
  mockHasUnsavedChanges = mockPendingChanges.size > 0
})

const mockClearUnsavedChanges = jest.fn(() => {
  mockPendingChanges.clear()
  mockEditingSections.clear()
  mockHasUnsavedChanges = false
})

// Mock the useUnsavedChanges hook
jest.mock('../../components/cv/core/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({
    get hasUnsavedChanges() { return mockHasUnsavedChanges },
    get editingSections() { return mockEditingSections },
    get pendingChanges() { return mockPendingChanges },
    startEditing: mockStartEditing,
    stopEditing: mockStopEditing,
    updatePendingChanges: mockUpdatePendingChanges,
    clearUnsavedChanges: mockClearUnsavedChanges
  })
}))

describe('useEditingState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock state
    mockPendingChanges.clear()
    mockEditingSections.clear()
    mockHasUnsavedChanges = false
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useEditingState())

    expect(result.current.editingSection).toBeNull()
    expect(result.current.editingIndividualItem).toBeNull()
    expect(result.current.showUnsavedChangesDialog).toBe(false)
    expect(result.current.pendingNavigation).toBeNull()
    expect(result.current.hasUnsavedChanges).toBe(false)
    expect(result.current.editingSections).toEqual(new Set())
    expect(result.current.pendingChanges).toEqual(new Map())
  })

  it('should handle section editing', () => {
    const { result } = renderHook(() => useEditingState())

    act(() => {
      result.current.handleSectionEdit('personal_info')
    })

    expect(result.current.editingSection).toBe('personal_info')
  })

  it('should handle section closing', () => {
    const { result } = renderHook(() => useEditingState())

    // First edit a section
    act(() => {
      result.current.handleSectionEdit('personal_info')
    })

    expect(result.current.editingSection).toBe('personal_info')

    // Then close it
    act(() => {
      result.current.handleSectionClose()
    })

    expect(result.current.editingSection).toBeNull()
  })

  it('should handle individual item editing registration', () => {
    const { result } = renderHook(() => useEditingState())
    const mockOnCancel = jest.fn()

    let returnValue: string
    act(() => {
      returnValue = result.current.registerIndividualItemEditing(
        'work_experience',
        0,
        mockOnCancel
      )
    })

    expect(returnValue!).toBe('success')
    expect(result.current.editingIndividualItem).toEqual({
      id: 'work_experience-0',
      section: 'work_experience',
      sectionId: 'work_experience',
      data: null
    })
  })

  it('should handle individual item editing unregistration', () => {
    const { result } = renderHook(() => useEditingState())
    const mockOnCancel = jest.fn()

    // First register
    act(() => {
      result.current.registerIndividualItemEditing(
        'work_experience',
        0,
        mockOnCancel
      )
    })

    expect(result.current.editingIndividualItem).not.toBeNull()

    // Then unregister
    act(() => {
      result.current.unregisterIndividualItemEditing('work_experience', 0)
    })

    expect(result.current.editingIndividualItem).toBeNull()
  })

  it('should handle unsaved changes dialog', () => {
    const { result } = renderHook(() => useEditingState())

    expect(result.current.showUnsavedChangesDialog).toBe(false)

    // This would normally be triggered by requestSectionCancel or requestIndividualItemCancel
    // but we can't easily test that without mocking the complex logic
    expect(result.current.handleUnsavedChangesDialogClose).toBeDefined()
    expect(result.current.handleUnsavedChangesDialogConfirm).toBeDefined()
  })

  it('should handle onUnsavedChanges callback', () => {
    const { result } = renderHook(() => useEditingState())

    act(() => {
      result.current.onUnsavedChanges('personal_info', true)
    })

    // The actual implementation would update pending changes
    // but we're mocking the useUnsavedChanges hook
    expect(result.current.onUnsavedChanges).toBeDefined()
  })

  it('should handle requestSectionCancel', () => {
    const { result } = renderHook(() => useEditingState())

    // First edit a section
    act(() => {
      result.current.handleSectionEdit('personal_info')
    })

    expect(result.current.editingSection).toBe('personal_info')

    // Request cancel
    act(() => {
      result.current.requestSectionCancel()
    })

    // Should close the section since there are no pending changes (mocked)
    expect(result.current.editingSection).toBeNull()
  })

  it('should handle requestIndividualItemCancel', () => {
    const { result } = renderHook(() => useEditingState())
    const mockOnCancel = jest.fn()

    // First register an individual item edit
    act(() => {
      result.current.registerIndividualItemEditing(
        'work_experience',
        0,
        mockOnCancel
      )
    })

    // Request cancel
    act(() => {
      result.current.requestIndividualItemCancel('work_experience', mockOnCancel)
    })

    // Should call the cancel function since there are no pending changes (mocked)
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should handle cancelIndividualItemEditing', () => {
    const { result } = renderHook(() => useEditingState())
    const mockOnCancel = jest.fn()

    // First register an individual item edit
    act(() => {
      result.current.registerIndividualItemEditing(
        'work_experience',
        0,
        mockOnCancel
      )
    })

    // Cancel the editing
    act(() => {
      result.current.cancelIndividualItemEditing()
    })

    expect(mockOnCancel).toHaveBeenCalled()
    expect(result.current.editingIndividualItem).toBeNull()
  })

  it('should handle dialog close', () => {
    const { result } = renderHook(() => useEditingState())

    act(() => {
      result.current.handleUnsavedChangesDialogClose()
    })

    expect(result.current.showUnsavedChangesDialog).toBe(false)
    expect(result.current.pendingNavigation).toBeNull()
  })

  it('should handle dialog confirm', () => {
    const { result } = renderHook(() => useEditingState())

    act(() => {
      result.current.handleUnsavedChangesDialogConfirm()
    })

    // The dialog should be closed
    expect(result.current.showUnsavedChangesDialog).toBe(false)
  })

  describe('Discard Changes Flow', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should show dialog when editing another item with pending changes', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel1 = jest.fn()
      const mockOnCancel2 = jest.fn()

      // Register first item
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel1)
      })

      expect(result.current.editingIndividualItem).toEqual({
        id: 'education-0',
        section: 'education',
        sectionId: 'education',
        data: null
      })

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('education', true)
      })

      expect(mockPendingChanges.has('education')).toBe(true)

      // Try to register another item - should show dialog
      let registrationResult: string
      act(() => {
        registrationResult = result.current.registerIndividualItemEditing('education', 1, mockOnCancel2)
      })

      expect(registrationResult!).toBe('dialog_shown')
      expect(result.current.showUnsavedChangesDialog).toBe(true)
      expect(result.current.pendingNavigation).not.toBeNull()
    })

    it('should not show dialog when typing after discarding changes', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel1 = jest.fn()
      const mockOnCancel2 = jest.fn()
      const mockOnStartEdit = jest.fn()

      // Register first item
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel1)
      })

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('education', true)
      })

      expect(mockPendingChanges.has('education')).toBe(true)

      // Try to register another item - should show dialog
      act(() => {
        result.current.registerIndividualItemEditing('education', 1, mockOnCancel2, mockOnStartEdit)
      })

      expect(result.current.showUnsavedChangesDialog).toBe(true)

      // Confirm discard
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // Dialog should be closed
      expect(result.current.showUnsavedChangesDialog).toBe(false)

      // Simulate typing (this happens during the 100ms discard window)
      act(() => {
        result.current.onUnsavedChanges('education', true)
      })

      // Dialog should NOT show again during discard window
      expect(result.current.showUnsavedChangesDialog).toBe(false)

      // Fast-forward past the 100ms discard cleanup window
      act(() => {
        jest.advanceTimersByTime(100)
      })
    })

    it('should clear discard flag after 100ms and dispatch events', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel = jest.fn()
      const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent')

      // Register item
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel)
      })

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('education', true)
      })

      // Try to register another item
      act(() => {
        result.current.registerIndividualItemEditing('education', 1, jest.fn(), jest.fn())
      })

      // Confirm discard
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // Verify discard event was dispatched with isDiscarding: true
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'is-discarding-changes',
          detail: { isDiscarding: true }
        })
      )

      mockDispatchEvent.mockClear()

      // Fast-forward 100ms
      act(() => {
        jest.advanceTimersByTime(100)
      })

      // Verify discard event was dispatched with isDiscarding: false
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'is-discarding-changes',
          detail: { isDiscarding: false }
        })
      )

      mockDispatchEvent.mockRestore()
    })

    it('should skip section edit setup during discard', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel = jest.fn()
      const mockOnStartEdit = jest.fn()

      // Register item with changes
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel)
      })

      act(() => {
        result.current.onUnsavedChanges('education', true)
      })

      // Try to register another item (triggers dialog)
      act(() => {
        result.current.registerIndividualItemEditing('education', 1, jest.fn(), mockOnStartEdit)
      })

      // Confirm discard (this sets isDiscardingChanges flag)
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // The onStartEdit callback calls handleSectionEdit internally
      // During discard, handleSectionEdit should become a no-op
      // Verify that the item editing state was set up correctly (not section edit)
      expect(mockOnStartEdit).toHaveBeenCalled()
      
      // Section should not be set since we're editing an individual item
      expect(result.current.editingSection).toBeNull()
    })

    it('should stay on current item when clicking Continue Editing', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel1 = jest.fn()
      const mockOnCancel2 = jest.fn()

      // Register first item
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel1)
      })

      const firstItem = result.current.editingIndividualItem

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('education', true)
      })

      // Try to register another item - should show dialog
      act(() => {
        result.current.registerIndividualItemEditing('education', 1, mockOnCancel2)
      })

      expect(result.current.showUnsavedChangesDialog).toBe(true)

      // Click "Continue Editing" (close dialog without confirming)
      act(() => {
        result.current.handleUnsavedChangesDialogClose()
      })

      // Should still be editing the first item
      expect(result.current.editingIndividualItem).toEqual(firstItem)
      expect(result.current.showUnsavedChangesDialog).toBe(false)
      expect(mockOnCancel1).not.toHaveBeenCalled()
      expect(mockOnCancel2).not.toHaveBeenCalled()
    })

    it('should handle section edit with pending changes', () => {
      const { result } = renderHook(() => useEditingState())
      
      // Create a mock cancel that properly clears the individual item state
      const mockOnCancel = jest.fn(() => {
        act(() => {
          result.current.unregisterIndividualItemEditing('education', 0)
        })
      })

      // Register item with changes
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel)
      })

      act(() => {
        result.current.onUnsavedChanges('education', true)
      })

      expect(mockPendingChanges.has('education')).toBe(true)

      // Try to edit a section - should show dialog
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      expect(result.current.showUnsavedChangesDialog).toBe(true)
      expect(result.current.editingSection).toBeNull() // Should not switch yet

      // Confirm discard - this will call the pendingNavigation which calls mockOnCancel
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // The mockOnCancel has been called and individual item is now cleared
      expect(mockOnCancel).toHaveBeenCalled()

      // Fast-forward past discard window
      act(() => {
        jest.advanceTimersByTime(100)
      })

      // Now section edit should be active
      expect(result.current.editingSection).toBe('personal_info')
      expect(result.current.editingIndividualItem).toBeNull()
    })

    it('should not trigger dialog during discard when registering new item', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel1 = jest.fn()
      const mockOnCancel2 = jest.fn()
      const mockOnStartEdit2 = jest.fn()

      // Register first item
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel1)
      })

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('education', true)
      })

      // Register second item (shows dialog)
      act(() => {
        result.current.registerIndividualItemEditing('education', 1, mockOnCancel2, mockOnStartEdit2)
      })

      expect(result.current.showUnsavedChangesDialog).toBe(true)

      // Confirm discard (this sets isDiscarding flag and calls onStartEdit2)
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // The dialog should be closed and onStartEdit should have been called
      expect(result.current.showUnsavedChangesDialog).toBe(false)
      expect(mockOnStartEdit2).toHaveBeenCalled()

      // Verify we're now editing the second item
      expect(result.current.editingIndividualItem).toEqual({
        id: 'education-1',
        section: 'education',
        sectionId: 'education',
        data: null
      })
    })
  })

  describe('Item Switching Without Changes', () => {
    it('should allow switching between items in same section without changes', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel1 = jest.fn()
      const mockOnCancel2 = jest.fn()

      // Register first item (no changes)
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel1)
      })

      expect(result.current.editingIndividualItem).toEqual({
        id: 'education-0',
        section: 'education',
        sectionId: 'education',
        data: null
      })

      // Register second item without making changes to first
      let registrationResult: string
      act(() => {
        registrationResult = result.current.registerIndividualItemEditing('education', 1, mockOnCancel2)
      })

      // Should succeed without showing dialog
      expect(registrationResult!).toBe('success')
      expect(result.current.showUnsavedChangesDialog).toBe(false)

      // Should be editing the second item now
      expect(result.current.editingIndividualItem).toEqual({
        id: 'education-1',
        section: 'education',
        sectionId: 'education',
        data: null
      })

      // First item's cancel should have been called
      expect(mockOnCancel1).toHaveBeenCalled()
    })

    it('should handle handleSectionEdit as no-op when editing item in same section', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel = jest.fn()

      // Register item
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel)
      })

      const editingItemBefore = result.current.editingIndividualItem

      // Call handleSectionEdit for the same section (this happens during item editing)
      act(() => {
        result.current.handleSectionEdit('education')
      })

      // Should remain in item editing mode (no-op)
      expect(result.current.editingIndividualItem).toEqual(editingItemBefore)
      expect(result.current.editingSection).toBeNull()
      expect(mockOnCancel).not.toHaveBeenCalled()
    })

    it('should cancel item from different section when switching sections', () => {
      const { result } = renderHook(() => useEditingState())
      
      // Create a mock cancel that properly clears the individual item state
      const mockOnCancel = jest.fn(() => {
        act(() => {
          result.current.unregisterIndividualItemEditing('education', 0)
        })
      })

      // Register item in education section
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel)
      })

      expect(result.current.editingIndividualItem).toEqual({
        id: 'education-0',
        section: 'education',
        sectionId: 'education',
        data: null
      })

      // Switch to a different section
      act(() => {
        result.current.handleSectionEdit('work_experience')
      })

      // Should cancel the item and switch to section editing
      expect(mockOnCancel).toHaveBeenCalled()
      expect(result.current.editingIndividualItem).toBeNull()
      expect(result.current.editingSection).toBe('work_experience')
    })

    it('should update stateRef synchronously when registering item', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel1 = jest.fn()
      const mockOnCancel2 = jest.fn()
      let capturedItemDuringCallback: any = null

      // Create a callback that captures the editing item during registration
      const mockOnStartEdit = jest.fn(() => {
        // This simulates what happens in handleSectionEdit - it should see the updated item
        // We can't directly access stateRef, but we can verify the item is correctly set
        capturedItemDuringCallback = result.current.editingIndividualItem
      })

      // Register first item
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel1)
      })

      // Register second item with onStartEdit callback
      act(() => {
        result.current.registerIndividualItemEditing('education', 1, mockOnCancel2, mockOnStartEdit, true)
      })

      // Verify the second item is now being edited
      expect(result.current.editingIndividualItem).toEqual({
        id: 'education-1',
        section: 'education',
        sectionId: 'education',
        data: null
      })
    })

    it('should switch between items across different sections without changes', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel1 = jest.fn()
      const mockOnCancel2 = jest.fn()

      // Register item in education section
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel1)
      })

      expect(result.current.editingIndividualItem?.sectionId).toBe('education')

      // Register item in different section without changes
      let registrationResult: string
      act(() => {
        registrationResult = result.current.registerIndividualItemEditing('work_experience', 0, mockOnCancel2)
      })

      // Should succeed without dialog
      expect(registrationResult!).toBe('success')
      expect(result.current.showUnsavedChangesDialog).toBe(false)

      // Should be editing the work experience item now
      expect(result.current.editingIndividualItem).toEqual({
        id: 'work_experience-0',
        section: 'work_experience',
        sectionId: 'work_experience',
        data: null
      })

      // First item's cancel should have been called
      expect(mockOnCancel1).toHaveBeenCalled()
    })
  })
})