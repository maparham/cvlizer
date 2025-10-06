/**
 * PDF-Style CV Editor Component
 * 
 * This module provides the main CV editing interface with PDF-like layout including:
 * - Section management sidebar for reordering and toggling visibility
 * - PDF-style content area with real-time editing
 * - Drag and drop functionality for section reordering
 * - Unsaved changes detection and confirmation dialogs
 * - Integration with CV editor context for state management
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Box } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

// Import extracted components and contexts
import {
  SectionManagerSidebar,
  CVContentArea,
  PDFCVEditorDialogs
} from './core'
import { InlineDiffProvider } from '../../contexts/InlineDiffContext'
import {
  useCVEditorControls,
  useCVEditorState,
  useCVEditor
} from '../../contexts/CVEditorContext'
import { ConnectedHistoryPanel, ConnectedHistoryPanelHandle } from './index'
import { useAIStore } from '../../stores/aiStore'
import { useAISuggestionsStore } from '../../stores/aiSuggestionsStore'

interface PDFCVEditorProps {
  title?: string
  onTitleSave?: (_newTitle: string) => Promise<void>
  cvId?: string
  onAIToolsRequest?: () => void
}

const PDFCVEditor: React.FC<PDFCVEditorProps> = ({ title, onTitleSave, cvId, onAIToolsRequest }) => {
  // Use context instead of props
  // Use consolidated context hooks
  const { sections, dragDrop, reset } = useCVEditorControls()
  const { changes } = useCVEditorState()
  const { cvData, onUpdateCV, onSave } = useCVEditor()
  const { loadJobDescriptions, getCVDrafts } = useAIStore()
  const { loadLatestAIEnhancement, clearAllSuggestions } = useAISuggestionsStore()

  // Debug wrapper for onUpdateCV
  const debugOnUpdateCV = useCallback((newCvData: any) => {
    onUpdateCV(newCvData);
  }, [onUpdateCV, cvData]);

  // Debug wrapper for onSave
  const debugOnSave = useCallback(async (newCvData: any, message?: string) => {
    await onSave(newCvData, message);
  }, [onSave]);

  // Tab state management
  const [sidebarTab, setSidebarTab] = useState(0)

  // Load job descriptions, drafts, and AI enhancements when CV changes
  useEffect(() => {
    if (cvId) {
      // Clear suggestions first to prevent showing wrong CV's suggestions
      clearAllSuggestions()

      // Then load data for the new CV
      loadJobDescriptions(cvId)
      getCVDrafts(cvId)
      loadLatestAIEnhancement(cvId)
    }
  }, [cvId, loadJobDescriptions, getCVDrafts, loadLatestAIEnhancement, clearAllSuggestions])
  
  // Handle AI Tools request from header
  useEffect(() => {
    if (onAIToolsRequest) {
      // Expose the switchToAITools function to parent
      window.switchToAITools = () => setSidebarTab(1)
    }
  }, [onAIToolsRequest])
  

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <InlineDiffProvider>
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Section Manager Sidebar */}
          <SectionManagerSidebar
          sections={sections.items}
          activeId={dragDrop.activeId}
          isDefaultOrder={sections.isDefaultOrder()}
          availableSectionsToAdd={sections.availableToAdd}
          title={title || 'Untitled CV'}
          cvId={cvId}
          cvData={cvData}
          onTitleSave={onTitleSave || (async () => {})}
          onToggleVisibility={sections.toggleVisibility}
          onAddNewSection={sections.add}
          onDragStart={dragDrop.onDragStart}
          onDragEnd={dragDrop.onDragEnd}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          onUpdateCV={debugOnUpdateCV}
          onSave={debugOnSave}
          onContentUpdate={(content, sectionType) => {
            if (sectionType === 'why_good_fit') {
              // Prevent client-side reconstruction of why_good_fit to avoid 422 validation errors
              // The backend is the source of truth for why_good_fit data structure
              // This prevents sending incomplete objects missing required fields like confidence_score
              console.warn('onContentUpdate: Skipping why_good_fit reconstruction to prevent validation errors');
              return;
            } else if (sectionType && content && (sectionType.includes('skills') || sectionType.includes('professional_summary') || sectionType.includes('work_experience'))) {
              // Handle adding keywords to various sections
              try {
                const updatedCvData = { ...cvData };
                const keyword = content;
                const suggestedPlacement = sectionType;
                
                if (suggestedPlacement.includes('skills section') || suggestedPlacement.includes('skills')) {
                  // Handle skills section
                  if (!updatedCvData.skills) {
                    updatedCvData.skills = { technical: [], soft: [], languages: [] };
                  }
                  if (!updatedCvData.skills.technical) updatedCvData.skills.technical = [];
                  if (!updatedCvData.skills.soft) updatedCvData.skills.soft = [];
                  if (!updatedCvData.skills.languages) updatedCvData.skills.languages = [];
                  
                  // Check if keyword already exists to avoid duplicates
                  const alreadyExists = 
                    updatedCvData.skills.technical.includes(keyword) ||
                    updatedCvData.skills.soft.includes(keyword) ||
                    updatedCvData.skills.languages.some(lang => 
                      typeof lang === 'string' ? lang === keyword : lang.language === keyword
                    );
                  
                  if (!alreadyExists) {
                    if (suggestedPlacement.includes('technical')) {
                      updatedCvData.skills.technical.push(keyword);
                    } else if (suggestedPlacement.includes('soft')) {
                      updatedCvData.skills.soft.push(keyword);
                    } else {
                      // Default to technical skills
                      updatedCvData.skills.technical.push(keyword);
                    }
                  }
                  
                  // Ensure skills section exists in section config
                  if (!sections.items.find(s => s.type === 'skills')) {
                    const maxOrder = sections.items.length > 0 ? Math.max(...sections.items.map(s => s.order)) : -1;
                    const newSection = {
                      id: 'skills',
                      type: 'skills' as const,
                      title: 'Skills',
                      visible: true,
                      order: maxOrder + 1
                    };
                    
                    const updatedSections = [...sections.items, newSection];
                    updatedCvData.section_config = {
                      sections: updatedSections
                    };
                  }
                  
                  onUpdateCV(updatedCvData);
                  onSave(updatedCvData, `Added "${keyword}" to skills`);
                } else if (suggestedPlacement.includes('professional_summary') || suggestedPlacement.includes('professional summary')) {
                  // Handle professional summary - enhance existing content with the keyword
                  if (!updatedCvData.professional_summary) {
                    updatedCvData.professional_summary = { content: '', keywords: [] };
                  }
                  
                  const currentContent = updatedCvData.professional_summary.content || '';
                  
                  if (!currentContent.toLowerCase().includes(keyword.toLowerCase())) {
                    // If no content exists, create a basic summary with the keyword
                    if (!currentContent.trim()) {
                      updatedCvData.professional_summary.content = `Experienced professional with expertise in ${keyword}.`;
                    } else {
                      // For existing content, try to integrate the keyword more naturally
                      // Look for common integration points
                      const sentences = currentContent.split(/[.!?]+/).filter(s => s.trim());
                      
                      if (sentences.length === 0) {
                        updatedCvData.professional_summary.content = `Experienced professional with expertise in ${keyword}.`;
                      } else if (sentences.length === 1) {
                        // Single sentence - add the keyword as a second sentence
                        const enhancedContent = currentContent.endsWith('.') 
                          ? `${currentContent} Proficient in ${keyword}.`
                          : `${currentContent}. Proficient in ${keyword}.`;
                        updatedCvData.professional_summary.content = enhancedContent;
                      } else {
                        // Multiple sentences - try to integrate into the first sentence if it makes sense
                        const firstSentence = sentences[0].trim();
                        const lowerFirst = firstSentence.toLowerCase();
                        
                        if (lowerFirst.includes('experienced') || lowerFirst.includes('professional') || lowerFirst.includes('expertise')) {
                          // Insert keyword into the first sentence
                          const insertPoint = firstSentence.includes('with') 
                            ? firstSentence.replace('with', `with ${keyword} and`)
                            : firstSentence.replace(/experienced|professional/, `experienced ${keyword} professional`);
                          const enhancedContent = currentContent.replace(firstSentence, insertPoint);
                          updatedCvData.professional_summary.content = enhancedContent;
                        } else {
                          // Fallback to adding as a new sentence
                          const enhancedContent = currentContent.endsWith('.') 
                            ? `${currentContent} Skilled in ${keyword}.`
                            : `${currentContent}. Skilled in ${keyword}.`;
                          updatedCvData.professional_summary.content = enhancedContent;
                        }
                      }
                    }
                  }
                  
                  onUpdateCV(updatedCvData);
                  onSave(updatedCvData, `Added "${keyword}" to professional summary`);
                } else if (suggestedPlacement.includes('work_experience') || suggestedPlacement.includes('work experience')) {
                  // Handle work experience - add to the most recent job
                  if (updatedCvData.work_experience && updatedCvData.work_experience.length > 0) {
                    const mostRecentJob = updatedCvData.work_experience[0];
                    if (mostRecentJob.description && !mostRecentJob.description.toLowerCase().includes(keyword.toLowerCase())) {
                      mostRecentJob.description = `${mostRecentJob.description} ${keyword}`;
                    } else if (!mostRecentJob.description) {
                      mostRecentJob.description = `Worked with ${keyword} technologies.`;
                    }
                    
                    onUpdateCV(updatedCvData);
                    onSave(updatedCvData, `Added "${keyword}" to work experience`);
                  } else {
                    // No work experience, add to skills instead
                    if (!updatedCvData.skills) {
                      updatedCvData.skills = { technical: [], soft: [], languages: [] };
                    }
                    if (!updatedCvData.skills.technical) updatedCvData.skills.technical = [];
                    
                    if (!updatedCvData.skills.technical.includes(keyword)) {
                      updatedCvData.skills.technical.push(keyword);
                    }
                    
                    onUpdateCV(updatedCvData);
                    onSave(updatedCvData, `Added "${keyword}" to skills (no work experience found)`);
                  }
                }
              } catch (error) {
              }
            }
          }}
        />

      {/* PDF-like CV Content */}
        <CVContentArea cvId={cvId} />

        {/* Dialogs */}
        <PDFCVEditorDialogs
          showResetDialog={reset.showDialog}
          showUnsavedChangesDialog={changes.showDialog}
          pendingChanges={changes.pendingChanges}
          onCloseResetDialog={reset.onCloseDialog}
          onConfirmReset={reset.onConfirmReset}
          onCloseUnsavedChangesDialog={changes.onCloseDialog}
          onConfirmUnsavedChanges={changes.onConfirmDialog}
        />

        {/* History Panel */}
        {cvId && <ConnectedHistoryPanel cvId={cvId} />}
        
        {/* History Panel Handle - Always visible when panel is closed */}
        {cvId && <ConnectedHistoryPanelHandle cvId={cvId} />}

        </Box>
      </InlineDiffProvider>
    </LocalizationProvider>
  )
}

export default PDFCVEditor
export type { PDFCVEditorProps }