import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  const mockProps = {
    editingSection: null,
    editingIndividualItem: null,
    pendingChanges: new Map(),
    onRequestSectionCancel: jest.fn(),
    onIndividualItemCancel: jest.fn(),
    showUnsavedChangesDialog: false,
    onShowUnsavedChangesDialog: jest.fn(),
    onSetPendingNavigation: jest.fn(),
    onUnsavedChangesDialogClose: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize without errors', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(mockProps))
    
    expect(result.current).toBeDefined()
  })

  it('should handle escape key when dialog is open', () => {
    const propsWithDialog = {
      ...mockProps,
      showUnsavedChangesDialog: true
    }
    
    renderHook(() => useKeyboardShortcuts(propsWithDialog))
    
    // Simulate escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(escapeEvent)
    
    expect(propsWithDialog.onUnsavedChangesDialogClose).toHaveBeenCalled()
  })

  it('should handle escape key when editing individual item with no changes', () => {
    const propsWithEditing = {
      ...mockProps,
      editingIndividualItem: { id: 'work_1', section: 'work_experience', sectionId: 'work_experience', data: {} }
    }
    
    renderHook(() => useKeyboardShortcuts(propsWithEditing))
    
    // Simulate escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(escapeEvent)
    
    expect(propsWithEditing.onIndividualItemCancel).toHaveBeenCalled()
  })

  it('should handle escape key when editing individual item with changes', () => {
    const pendingChanges = new Map()
    pendingChanges.set('work_experience', { hasChanges: true })
    
    const propsWithEditing = {
      ...mockProps,
      editingIndividualItem: { id: 'work_1', section: 'work_experience', sectionId: 'work_experience', data: {} },
      pendingChanges
    }
    
    renderHook(() => useKeyboardShortcuts(propsWithEditing))
    
    // Simulate escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(escapeEvent)
    
    expect(propsWithEditing.onShowUnsavedChangesDialog).toHaveBeenCalledWith(true)
    expect(propsWithEditing.onSetPendingNavigation).toHaveBeenCalled()
  })

  it('should handle escape key when editing section with no changes', () => {
    const propsWithEditing = {
      ...mockProps,
      editingSection: 'personal_info'
    }
    
    renderHook(() => useKeyboardShortcuts(propsWithEditing))
    
    // Simulate escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(escapeEvent)
    
    expect(propsWithEditing.onRequestSectionCancel).toHaveBeenCalled()
  })

  it('should handle escape key when editing section with changes', () => {
    const pendingChanges = new Map()
    pendingChanges.set('personal_info', { hasChanges: true })
    
    const propsWithEditing = {
      ...mockProps,
      editingSection: 'personal_info',
      pendingChanges
    }
    
    renderHook(() => useKeyboardShortcuts(propsWithEditing))
    
    // Simulate escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(escapeEvent)
    
    expect(propsWithEditing.onShowUnsavedChangesDialog).toHaveBeenCalledWith(true)
    expect(propsWithEditing.onSetPendingNavigation).toHaveBeenCalled()
  })

  it('should handle Ctrl+S save shortcut', () => {
    // Mock querySelectorAll to return a save button
    const mockSaveButton = {
      disabled: false,
      click: jest.fn()
    }
    
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockSaveButton] as any)
    
    renderHook(() => useKeyboardShortcuts(mockProps))
    
    // Simulate Ctrl+S
    const saveEvent = new KeyboardEvent('keydown', { 
      key: 's', 
      ctrlKey: true 
    })
    window.dispatchEvent(saveEvent)
    
    expect(mockSaveButton.click).toHaveBeenCalled()
  })

  it('should handle Cmd+S save shortcut on Mac', () => {
    // Mock querySelectorAll to return a save button
    const mockSaveButton = {
      disabled: false,
      click: jest.fn()
    }
    
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockSaveButton] as any)
    
    renderHook(() => useKeyboardShortcuts(mockProps))
    
    // Simulate Cmd+S (Mac)
    const saveEvent = new KeyboardEvent('keydown', { 
      key: 's', 
      metaKey: true 
    })
    window.dispatchEvent(saveEvent)
    
    expect(mockSaveButton.click).toHaveBeenCalled()
  })

  it('should not trigger save shortcut for disabled button', () => {
    // Mock querySelectorAll to return a disabled save button
    const mockSaveButton = {
      disabled: true,
      click: jest.fn()
    }
    
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockSaveButton] as any)
    
    renderHook(() => useKeyboardShortcuts(mockProps))
    
    // Simulate Ctrl+S
    const saveEvent = new KeyboardEvent('keydown', { 
      key: 's', 
      ctrlKey: true 
    })
    window.dispatchEvent(saveEvent)
    
    expect(mockSaveButton.click).not.toHaveBeenCalled()
  })

  it('should handle beforeunload event with pending changes', () => {
    const pendingChanges = new Map()
    pendingChanges.set('personal_info', { hasChanges: true })
    
    const propsWithChanges = {
      ...mockProps,
      pendingChanges
    }
    
    renderHook(() => useKeyboardShortcuts(propsWithChanges))
    
    // Simulate beforeunload event
    const beforeUnloadEvent = new Event('beforeunload') as BeforeUnloadEvent
    beforeUnloadEvent.preventDefault = jest.fn()
    
    window.dispatchEvent(beforeUnloadEvent)
    
    expect(beforeUnloadEvent.preventDefault).toHaveBeenCalled()
  })

  it('should not handle beforeunload event without pending changes', () => {
    renderHook(() => useKeyboardShortcuts(mockProps))
    
    // Simulate beforeunload event
    const beforeUnloadEvent = new Event('beforeunload') as BeforeUnloadEvent
    beforeUnloadEvent.preventDefault = jest.fn()
    
    window.dispatchEvent(beforeUnloadEvent)
    
    expect(beforeUnloadEvent.preventDefault).not.toHaveBeenCalled()
  })

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useKeyboardShortcuts(mockProps))
    
    unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('should handle escape key fallback to cancel buttons', () => {
    // Mock querySelectorAll to return cancel buttons
    const mockCancelButton = {
      disabled: false,
      offsetParent: {},
      getBoundingClientRect: () => ({ width: 100 }),
      click: jest.fn(),
      closest: () => ({ classList: { contains: () => true } })
    }
    
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockCancelButton] as any)
    
    renderHook(() => useKeyboardShortcuts(mockProps))
    
    // Simulate escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(escapeEvent)
    
    expect(mockCancelButton.click).toHaveBeenCalled()
  })
})