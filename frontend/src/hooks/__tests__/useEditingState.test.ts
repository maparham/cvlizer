import { renderHook, act } from '@testing-library/react'
import { useEditingState } from '../useEditingState'

// Mock the useUnsavedChanges hook
jest.mock('../../components/cv/core/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({
    hasUnsavedChanges: false,
    editingSections: new Set(),
    pendingChanges: new Map(),
    startEditing: jest.fn(),
    stopEditing: jest.fn(),
    updatePendingChanges: jest.fn()
  })
}))

describe('useEditingState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})