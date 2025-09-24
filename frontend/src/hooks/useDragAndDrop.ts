/**
 * Drag and Drop Hook
 * 
 * This module provides drag and drop functionality for reordering CV sections
 * using the @dnd-kit library. It handles drag start/end events and section reordering.
 * 
 * Key responsibilities:
 * - Manage active drag state and visual feedback
 * - Handle drag start and end events from @dnd-kit
 * - Reorder sections using arrayMove utility
 * - Provide clean interface for drag and drop operations
 * 
 * Usage:
 * - Use in components that need drag and drop functionality
 * - Pass sections array and reorder callback
 * - Returns drag handlers and active state for UI feedback
 */
import { useState, useCallback } from 'react'
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { CVSection } from '../types'

interface DragAndDropHook {
  activeId: string | null
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
}

interface UseDragAndDropProps {
  sections: CVSection[]
  onReorderSections: (sections: CVSection[]) => void
}

export const useDragAndDrop = ({ 
  sections, 
  onReorderSections 
}: UseDragAndDropProps): DragAndDropHook => {
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex((item) => item.id === active.id)
      const newIndex = sections.findIndex((item) => item.id === over?.id)
      
      const newSections = arrayMove(sections, oldIndex, newIndex)
      onReorderSections(newSections)
    }

    setActiveId(null)
  }, [sections, onReorderSections])

  return {
    activeId,
    handleDragStart,
    handleDragEnd
  }
}
