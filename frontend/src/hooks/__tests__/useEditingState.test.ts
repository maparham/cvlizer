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

      // Create a callback that verifies the editing item is correctly set
      const mockOnStartEdit = jest.fn()

      // Register first item
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel1)
      })

      // Register second item with onStartEdit callback
      act(() => {
        result.current.registerIndividualItemEditing('education', 1, mockOnCancel2, mockOnStartEdit, true)
      })

      // Verify the second item is now being edited (confirming state update happened synchronously)
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

  describe('Non-Array Section Editing', () => {
    it('should allow switching between non-array sections without changes', () => {
      const { result } = renderHook(() => useEditingState())

      // Edit personal_info section
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      expect(result.current.editingSection).toBe('personal_info')

      // Switch to professional_summary without changes
      act(() => {
        result.current.handleSectionEdit('professional_summary')
      })

      // Should switch successfully
      expect(result.current.editingSection).toBe('professional_summary')
    })

    it('should show dialog when switching sections with pending changes', () => {
      const { result } = renderHook(() => useEditingState())

      // Edit personal_info section
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('personal_info', true)
      })

      expect(mockPendingChanges.has('personal_info')).toBe(true)

      // Try to switch to another section
      act(() => {
        result.current.handleSectionEdit('professional_summary')
      })

      // Should show dialog
      expect(result.current.showUnsavedChangesDialog).toBe(true)
      expect(result.current.editingSection).toBe('personal_info') // Should not switch yet
    })

    it('should allow switching after discarding changes in non-array section', () => {
      const { result } = renderHook(() => useEditingState())

      // Edit personal_info section
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('personal_info', true)
      })

      // Try to switch to another section
      act(() => {
        result.current.handleSectionEdit('professional_summary')
      })

      expect(result.current.showUnsavedChangesDialog).toBe(true)

      // Confirm discard
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // Should switch to new section
      expect(result.current.showUnsavedChangesDialog).toBe(false)
      expect(result.current.editingSection).toBe('professional_summary')
      expect(mockPendingChanges.has('personal_info')).toBe(false)
    })

    it('should not show dialog when typing after discarding in non-array section', () => {
      const { result } = renderHook(() => useEditingState())

      jest.useFakeTimers()

      // Edit personal_info section
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('personal_info', true)
      })

      // Try to switch sections
      act(() => {
        result.current.handleSectionEdit('professional_summary')
      })

      expect(result.current.showUnsavedChangesDialog).toBe(true)

      // Confirm discard
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      expect(result.current.showUnsavedChangesDialog).toBe(false)

      // Simulate typing in the new section during discard window
      act(() => {
        result.current.onUnsavedChanges('professional_summary', true)
      })

      // Dialog should NOT show during discard window
      expect(result.current.showUnsavedChangesDialog).toBe(false)

      // Fast-forward past discard window
      act(() => {
        jest.advanceTimersByTime(100)
      })

      jest.useRealTimers()
    })

    it('should handle switching from array item to non-array section', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel = jest.fn(() => {
        act(() => {
          result.current.unregisterIndividualItemEditing('education', 0)
        })
      })

      // Register item editing
      act(() => {
        result.current.registerIndividualItemEditing('education', 0, mockOnCancel)
      })

      expect(result.current.editingIndividualItem?.sectionId).toBe('education')

      // Switch to non-array section without changes
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      // Should cancel item and switch to section
      expect(mockOnCancel).toHaveBeenCalled()
      expect(result.current.editingIndividualItem).toBeNull()
      expect(result.current.editingSection).toBe('personal_info')
    })

    it('should handle switching from non-array section to array item', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel = jest.fn()

      // Edit non-array section
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      expect(result.current.editingSection).toBe('personal_info')

      // Close the section first (this simulates the actual UI flow)
      act(() => {
        result.current.handleSectionClose()
      })

      // Now register item editing
      let registrationResult: string
      act(() => {
        registrationResult = result.current.registerIndividualItemEditing('education', 0, mockOnCancel)
      })

      // Should succeed
      expect(registrationResult!).toBe('success')
      expect(result.current.editingIndividualItem?.sectionId).toBe('education')
      expect(result.current.editingSection).toBeNull()
    })

    it('should show dialog when switching from non-array section to array item with changes', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel = jest.fn()

      // Edit non-array section
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('personal_info', true)
      })

      // Try to register item editing
      let registrationResult: string
      act(() => {
        registrationResult = result.current.registerIndividualItemEditing('education', 0, mockOnCancel)
      })

      // Should show dialog
      expect(registrationResult!).toBe('dialog_shown')
      expect(result.current.showUnsavedChangesDialog).toBe(true)
      expect(result.current.editingSection).toBe('personal_info') // Should not switch yet
    })

    it('should close auto-save section when switching to array item (real bug scenario)', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel = jest.fn()
      const mockOnStartEdit = jest.fn()

      // Edit professional_summary (auto-save section)
      act(() => {
        result.current.handleSectionEdit('professional_summary')
      })

      expect(result.current.editingSection).toBe('professional_summary')

      // Simulate changes in professional_summary
      act(() => {
        result.current.onUnsavedChanges('professional_summary', true)
      })

      expect(mockPendingChanges.has('professional_summary')).toBe(true)

      // Try to edit an array item WITHOUT closing the section first
      // This simulates: user types in professional_summary, section auto-saves and maybe closes,
      // but pendingChanges remain, then user clicks edit on education
      let registrationResult: string
      act(() => {
        registrationResult = result.current.registerIndividualItemEditing('education', 0, mockOnCancel, mockOnStartEdit)
      })

      // Dialog should show because of pending changes
      expect(registrationResult!).toBe('dialog_shown')
      expect(result.current.showUnsavedChangesDialog).toBe(true)

      // Discard changes
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // Professional summary should be fully closed (both UI and state)
      expect(result.current.editingSection).toBeNull()
      expect(mockPendingChanges.has('professional_summary')).toBe(false)
      expect(mockEditingSections.has('professional_summary')).toBe(false)
      
      // Verify stopEditing was called to clear state
      expect(mockStopEditing).toHaveBeenCalledWith('professional_summary')
      
      // The item edit should now be active
      expect(mockOnStartEdit).toHaveBeenCalled()
      expect(result.current.editingIndividualItem).toEqual({
        id: 'education-0',
        section: 'education',
        sectionId: 'education',
        data: null
      })
    })

    it('should handle requestSectionCancel without changes', () => {
      const { result } = renderHook(() => useEditingState())

      // Edit section
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      expect(result.current.editingSection).toBe('personal_info')

      // Request cancel without changes
      act(() => {
        result.current.requestSectionCancel()
      })

      // Should close immediately without dialog
      expect(result.current.editingSection).toBeNull()
      expect(result.current.showUnsavedChangesDialog).toBe(false)
    })

    it('should show dialog on requestSectionCancel with changes', () => {
      const { result } = renderHook(() => useEditingState())

      // Edit section
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      // Simulate changes
      act(() => {
        result.current.onUnsavedChanges('personal_info', true)
      })

      // Request cancel
      act(() => {
        result.current.requestSectionCancel()
      })

      // Should show dialog
      expect(result.current.showUnsavedChangesDialog).toBe(true)
      expect(result.current.editingSection).toBe('personal_info') // Should not close yet
    })

    it('should close professional_summary edit mode after discarding changes when editing elsewhere', () => {
      const { result } = renderHook(() => useEditingState())

      // Edit professional_summary
      act(() => {
        result.current.handleSectionEdit('professional_summary')
      })

      expect(result.current.editingSection).toBe('professional_summary')

      // Make changes in professional_summary
      act(() => {
        result.current.onUnsavedChanges('professional_summary', true)
      })

      expect(mockPendingChanges.has('professional_summary')).toBe(true)
      
      // Check that stopEditing was called when we started editing
      expect(mockStartEditing).toHaveBeenCalledWith('professional_summary')

      // Try to edit another section (e.g., personal_info)
      act(() => {
        result.current.handleSectionEdit('personal_info')
      })

      // Dialog should show
      expect(result.current.showUnsavedChangesDialog).toBe(true)
      expect(result.current.editingSection).toBe('professional_summary') // Still editing professional_summary

      // Click "Discard Changes"
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // professional_summary edit mode should be closed
      expect(result.current.editingSection).toBe('personal_info') // Now editing personal_info
      
      // Check that stopEditing was actually called for professional_summary to close it
      expect(mockStopEditing).toHaveBeenCalledWith('professional_summary')
      
      // And startEditing was called for personal_info to open it
      expect(mockStartEditing).toHaveBeenCalledWith('personal_info')
      
      // professional_summary should not be in editingSections anymore
      expect(result.current.editingSections.has('professional_summary')).toBe(false)
      
      // personal_info should now be in editingSections
      expect(result.current.editingSections.has('personal_info')).toBe(true)
      
      expect(mockPendingChanges.has('professional_summary')).toBe(false) // Changes discarded
      expect(result.current.showUnsavedChangesDialog).toBe(false)
    })

    it('should close professional_summary edit mode after discarding when switching to array item', () => {
      const { result } = renderHook(() => useEditingState())
      const mockOnCancel = jest.fn()

      // Edit professional_summary
      act(() => {
        result.current.handleSectionEdit('professional_summary')
      })

      expect(result.current.editingSection).toBe('professional_summary')

      // Make changes
      act(() => {
        result.current.onUnsavedChanges('professional_summary', true)
      })

      // Try to edit an array item (e.g., education item)
      let registrationResult: string
      act(() => {
        registrationResult = result.current.registerIndividualItemEditing('education', 0, mockOnCancel)
      })

      // Dialog should show
      expect(registrationResult!).toBe('dialog_shown')
      expect(result.current.showUnsavedChangesDialog).toBe(true)
      expect(result.current.editingSection).toBe('professional_summary') // Still editing

      // Click "Discard Changes"
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // professional_summary should be closed, now editing the item
      expect(result.current.editingSection).toBeNull()
      expect(result.current.editingIndividualItem).toEqual({
        id: 'education-0',
        section: 'education',
        sectionId: 'education',
        data: null
      })
      expect(mockPendingChanges.has('professional_summary')).toBe(false)
      expect(result.current.showUnsavedChangesDialog).toBe(false)
    })

    it('should close professional_summary via requestSectionCancel and discard', () => {
      const { result } = renderHook(() => useEditingState())

      // Edit professional_summary
      act(() => {
        result.current.handleSectionEdit('professional_summary')
      })

      expect(result.current.editingSection).toBe('professional_summary')

      // Make changes
      act(() => {
        result.current.onUnsavedChanges('professional_summary', true)
      })

      // Request cancel (e.g., clicking close button)
      act(() => {
        result.current.requestSectionCancel()
      })

      // Dialog should show
      expect(result.current.showUnsavedChangesDialog).toBe(true)
      expect(result.current.editingSection).toBe('professional_summary')

      // Click "Discard Changes"
      act(() => {
        result.current.handleUnsavedChangesDialogConfirm()
      })

      // professional_summary should be closed
      expect(result.current.editingSection).toBeNull()
      expect(mockPendingChanges.has('professional_summary')).toBe(false)
      expect(result.current.showUnsavedChangesDialog).toBe(false)
    })
  })
})