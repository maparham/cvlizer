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
