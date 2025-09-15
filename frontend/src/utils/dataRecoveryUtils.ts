/**
 * Data recovery utilities for CV components
 */

export interface DraftData {
  id: string
  sectionId: string
  data: any
  timestamp: number
  version: number
}

export interface ConflictResolution {
  type: 'local' | 'remote' | 'merge'
  resolvedData: any
  conflicts: string[]
}

/**
 * Draft management utilities
 */
export class DraftManager {
  private static readonly DRAFT_PREFIX = 'cv_draft_'
  private static readonly MAX_DRAFTS = 10
  private static readonly DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Save draft data
   */
  static saveDraft(sectionId: string, data: any): string {
    const draftId = `${this.DRAFT_PREFIX}${sectionId}_${Date.now()}`
    const draft: DraftData = {
      id: draftId,
      sectionId,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
      version: 1
    }

    try {
      localStorage.setItem(draftId, JSON.stringify(draft))
      this.cleanupOldDrafts(sectionId)
      return draftId
    } catch (error) {
      console.warn('Failed to save draft:', error)
      return ''
    }
  }

  /**
   * Load draft data
   */
  static loadDraft(sectionId: string): DraftData | null {
    try {
      const drafts = this.getAllDrafts(sectionId)
      if (drafts.length === 0) return null

      // Return the most recent draft
      const latestDraft = drafts[0]
      
      // Check if draft is expired
      if (Date.now() - latestDraft.timestamp > this.DRAFT_EXPIRY_MS) {
        this.clearDrafts(sectionId)
        return null
      }

      return latestDraft
    } catch (error) {
      console.warn('Failed to load draft:', error)
      return null
    }
  }

  /**
   * Get all drafts for a section
   */
  static getAllDrafts(sectionId: string): DraftData[] {
    const drafts: DraftData[] = []
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(`${this.DRAFT_PREFIX}${sectionId}_`)) {
          const draftData = localStorage.getItem(key)
          if (draftData) {
            const draft = JSON.parse(draftData) as DraftData
            drafts.push(draft)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get drafts:', error)
    }

    // Sort by timestamp (newest first)
    return drafts.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Clear all drafts for a section
   */
  static clearDrafts(sectionId: string): void {
    try {
      const drafts = this.getAllDrafts(sectionId)
      drafts.forEach(draft => {
        localStorage.removeItem(draft.id)
      })
    } catch (error) {
      console.warn('Failed to clear drafts:', error)
    }
  }

  /**
   * Clean up old drafts
   */
  private static cleanupOldDrafts(sectionId: string): void {
    const drafts = this.getAllDrafts(sectionId)
    
    if (drafts.length > this.MAX_DRAFTS) {
      // Keep only the most recent drafts
      const draftsToKeep = drafts.slice(0, this.MAX_DRAFTS)
      const draftsToRemove = drafts.slice(this.MAX_DRAFTS)
      
      draftsToRemove.forEach(draft => {
        localStorage.removeItem(draft.id)
      })
    }

    // Remove expired drafts
    const now = Date.now()
    drafts.forEach(draft => {
      if (now - draft.timestamp > this.DRAFT_EXPIRY_MS) {
        localStorage.removeItem(draft.id)
      }
    })
  }
}

/**
 * Conflict resolution utilities
 */
export class ConflictResolver {
  /**
   * Detect conflicts between local and remote data
   */
  static detectConflicts(localData: any, remoteData: any): string[] {
    const conflicts: string[] = []
    
    if (!localData || !remoteData) return conflicts

    // Compare top-level fields
    Object.keys(localData).forEach(key => {
      if (remoteData.hasOwnProperty(key)) {
        const localValue = localData[key]
        const remoteValue = remoteData[key]
        
        if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
          conflicts.push(key)
        }
      }
    })

    return conflicts
  }

  /**
   * Resolve conflicts using different strategies
   */
  static resolveConflicts(
    localData: any,
    remoteData: any,
    strategy: 'local' | 'remote' | 'merge' = 'merge'
  ): ConflictResolution {
    const conflicts = this.detectConflicts(localData, remoteData)
    let resolvedData: any

    switch (strategy) {
      case 'local':
        resolvedData = { ...localData }
        break
      case 'remote':
        resolvedData = { ...remoteData }
        break
      case 'merge':
        resolvedData = this.mergeData(localData, remoteData)
        break
    }

    return {
      type: strategy,
      resolvedData,
      conflicts
    }
  }

  /**
   * Merge data with conflict resolution
   */
  private static mergeData(localData: any, remoteData: any): any {
    const merged = { ...remoteData }

    // Merge local changes that don't conflict
    Object.keys(localData).forEach(key => {
      if (!remoteData.hasOwnProperty(key)) {
        merged[key] = localData[key]
      } else if (Array.isArray(localData[key]) && Array.isArray(remoteData[key])) {
        // For arrays, prefer local data if it's more recent or has more items
        merged[key] = localData[key].length >= remoteData[key].length 
          ? localData[key] 
          : remoteData[key]
      } else if (typeof localData[key] === 'object' && typeof remoteData[key] === 'object') {
        // For objects, recursively merge
        merged[key] = this.mergeData(localData[key], remoteData[key])
      } else {
        // For primitives, prefer local data
        merged[key] = localData[key]
      }
    })

    return merged
  }
}

/**
 * Auto-save with conflict detection
 */
export class AutoSaveManager {
  private static saveQueue: Map<string, any> = new Map()
  private static saveTimeout: NodeJS.Timeout | null = null

  /**
   * Queue data for auto-save
   */
  static queueSave(sectionId: string, data: any): void {
    this.saveQueue.set(sectionId, data)
    
    // Debounce saves
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    
    this.saveTimeout = setTimeout(() => {
      this.processSaveQueue()
    }, 1000) // Save after 1 second of inactivity
  }

  /**
   * Process the save queue
   */
  private static processSaveQueue(): void {
    this.saveQueue.forEach((data, sectionId) => {
      try {
        // Save to draft
        DraftManager.saveDraft(sectionId, data)
        
        // Here you would typically also save to the server
        // For now, we'll just log it
        console.log(`Auto-saved section ${sectionId}:`, data)
      } catch (error) {
        console.warn(`Failed to auto-save section ${sectionId}:`, error)
      }
    })
    
    this.saveQueue.clear()
  }

  /**
   * Force immediate save
   */
  static forceSave(sectionId: string, data: any): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        DraftManager.saveDraft(sectionId, data)
        console.log(`Force saved section ${sectionId}:`, data)
        resolve(true)
      } catch (error) {
        console.warn(`Failed to force save section ${sectionId}:`, error)
        resolve(false)
      }
    })
  }
}

/**
 * Data recovery hooks and utilities
 */
export const useDataRecovery = (sectionId: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)

  const saveDraft = React.useCallback((data: any) => {
    const draftId = DraftManager.saveDraft(sectionId, data)
    if (draftId) {
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
    }
  }, [sectionId])

  const loadDraft = React.useCallback(() => {
    return DraftManager.loadDraft(sectionId)
  }, [sectionId])

  const clearDraft = React.useCallback(() => {
    DraftManager.clearDrafts(sectionId)
    setHasUnsavedChanges(false)
    setLastSaved(null)
  }, [sectionId])

  const queueAutoSave = React.useCallback((data: any) => {
    AutoSaveManager.queueSave(sectionId, data)
    setHasUnsavedChanges(true)
  }, [sectionId])

  return {
    hasUnsavedChanges,
    lastSaved,
    saveDraft,
    loadDraft,
    clearDraft,
    queueAutoSave
  }
}

// Import React for the hook
import React from 'react'
