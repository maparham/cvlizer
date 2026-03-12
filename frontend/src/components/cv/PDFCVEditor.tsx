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
import React, { useEffect, useCallback, useRef, useState } from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// Import extracted components and contexts
import { CVEditorMobileBar } from "./CVEditorMobileBar";
import {
  SectionManagerSidebar,
  CVContentArea,
  PDFCVEditorDialogs,
} from "./core";
import {
  useCVEditorControls,
  useCVEditorState,
  useCVEditor,
} from "../../contexts/CVEditorContext";
import { ConnectedHistoryPanel, ConnectedHistoryPanelHandle } from "./index";
import { useAIStore } from "../../stores/ai";
import { useAISuggestionsStore } from "../../stores/aiSuggestionsStore";
import { useCVQualityStore } from "../../stores/cvQualityStore";
import { getPersistedCorrectionMode } from "../../stores/cvQualityPersistence";
import { isTempCVId, useCVStore } from "../../stores/cv";
import { CVData } from "../../types/cv";
import { useUIStore } from "../../stores/uiStore";
import { useAITaskPollingContext } from "../../contexts/AITaskPollingContext";

interface PDFCVEditorProps {
  title?: string;
  onTitleSave?: (_newTitle: string) => Promise<void>;
  cvId?: string;
}

const PDFCVEditor: React.FC<PDFCVEditorProps> = ({
  title,
  onTitleSave,
  cvId,
}) => {
  // Use context instead of props
  // Use consolidated context hooks
  const { sections, dragDrop, reset } = useCVEditorControls();
  const { changes } = useCVEditorState();
  const { cvData, onUpdateCV, onSave } = useCVEditor();
  const { loadJobDescriptions, getCVDrafts } = useAIStore();
  const { loadLatestAIEnhancement, clearAllSuggestions } =
    useAISuggestionsStore();
  const { loadLatestQualityAnalysis, generateQualityAnalysis, qualityAnalysis, analysisLoading, currentAnalysisId, currentCorrectionMode } =
    useCVQualityStore();
  const { addTask, activeTasks } = useAITaskPollingContext();
  const currentCV = useCVStore((state) => state.currentCV);


  const setCVEditorTab = useUIStore((state) => state.setCVEditorTab);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobilePanel, setMobilePanel] = useState<"sidebar" | "content">("content");

  // Debug wrapper for onUpdateCV
  const debugOnUpdateCV = useCallback(
    (newCvData: CVData) => {
      onUpdateCV(newCvData);
    },
    [onUpdateCV],
  );

  // Debug wrapper for onSave
  const debugOnSave = useCallback(
    async (newCvData: CVData, message?: string) => {
      await onSave(newCvData, message);
    },
    [onSave],
  );

  // Tab state management - use Zustand store to persist across navigation
  const cvIdForTabs = cvId || "default";
  const sidebarTab = useUIStore(
    (state) => state.cvEditorTabs[cvIdForTabs] ?? 0,
  );
  const setSidebarTab = useCallback(
    (newTab: number) => {
      setCVEditorTab(cvIdForTabs, newTab);
    },
    [cvIdForTabs, setCVEditorTab],
  );

  // Set up window.switchToAITools function for external access
  useEffect(() => {
    (window as any).switchToAITools = () => {
      setSidebarTab(1); // Switch to AI Tools tab (index 1)
    };

    // Cleanup function to remove the global function when component unmounts
    return () => {
      delete (window as any).switchToAITools;
    };
  }, [setSidebarTab]);

  // Load job descriptions, drafts, and AI enhancements when CV ID changes (switching CVs)
  // loadJobDescriptions automatically restores the active job description from localStorage
  useEffect(() => {
    if (cvId && !isTempCVId(cvId)) {
      // Clear suggestions first to prevent showing wrong CV's suggestions
      clearAllSuggestions();
      loadJobDescriptions(cvId);
      getCVDrafts(cvId);
      loadLatestAIEnhancement(cvId);
      // Pass CV updated_at to ensure we don't load stale analyses
      loadLatestQualityAnalysis(cvId, currentCV?.updated_at);
    }
  }, [
    cvId,
    loadJobDescriptions,
    getCVDrafts,
    loadLatestAIEnhancement,
    clearAllSuggestions,
    loadLatestQualityAnalysis,
  ]);

  // Reload quality analysis when CV is updated (but don't reload drafts - they're independent)
  // This ensures we don't show stale quality analysis after CV changes
  useEffect(() => {
    if (cvId && !isTempCVId(cvId) && currentCV?.updated_at) {
      loadLatestQualityAnalysis(cvId, currentCV.updated_at);
    }
  }, [cvId, currentCV?.updated_at, loadLatestQualityAnalysis]);

  // Resume polling for in-progress quality analyses after page refresh
  // Use persisted correctionMode when store has none (e.g. auth cleared activeTasks before restore)
  useEffect(() => {
    if (currentAnalysisId && analysisLoading && cvId && !isTempCVId(cvId)) {
      const mode = currentCorrectionMode ?? getPersistedCorrectionMode(currentAnalysisId);
      addTask({
        id: currentAnalysisId,
        type: 'cv_quality_analysis',
        cvId,
        isGenerating: true,
        ...(mode && { data: { correctionMode: mode } }),
      });
    }
  }, [currentAnalysisId, analysisLoading, cvId, currentCorrectionMode, addTask]);

  // Auto-trigger "fix spelling and grammar" on first load for file-parsed CVs only
  // Use ref to track if auto-trigger has been attempted for this CV
  const autoTriggerAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset ref when CV changes
    if (cvId !== autoTriggerAttemptedRef.current) {
      autoTriggerAttemptedRef.current = null;
    }

    // Only auto-trigger for file-parsed CVs (not manually created), parsed, and no analysis yet
    const shouldAutoTrigger =
      cvId &&
      !isTempCVId(cvId) &&
      currentCV?.is_parsed === true &&
      currentCV?.is_imported === true &&
      !qualityAnalysis &&
      !analysisLoading &&
      !autoTriggerAttemptedRef.current;

    // Check if analysis is already being polled for this CV
    const hasActivePolling = Array.from(activeTasks.values()).some(
      (task) => task.type === 'cv_quality_analysis' && task.cvId === cvId && task.isGenerating
    );

    if (shouldAutoTrigger && !hasActivePolling) {
      // Mark as attempted when scheduling to prevent multiple timeouts for the same CV
      autoTriggerAttemptedRef.current = cvId ?? null;

      // Auto-trigger proofread analysis for file-parsed CVs (first time only)
      // Delay ensures loadLatestQualityAnalysis has time to complete and currentCV may load
      const triggerAnalysis = async () => {
        // Bail out if CV changed before timeout fired
        if (!cvId || autoTriggerAttemptedRef.current !== cvId) {
          return;
        }

        // Double-check conditions before triggering
        if (
          isTempCVId(cvId) ||
          !currentCV?.is_parsed ||
          !currentCV?.is_imported ||
          qualityAnalysis ||
          analysisLoading
        ) {
          return;
        }

        // Check again if already polling
        const stillHasActivePolling = Array.from(activeTasks.values()).some(
          (task) => task.type === 'cv_quality_analysis' && task.cvId === cvId && task.isGenerating
        );
        if (stillHasActivePolling) {
          return;
        }

        try {
          const analysisId = await generateQualityAnalysis(cvId, 'proofread');
          if (analysisId) {
            addTask({
              id: analysisId,
              type: 'cv_quality_analysis',
              cvId,
              isGenerating: true,
              data: { correctionMode: 'proofread' as const },
            });
          }
        } catch (error) {
          // Reset ref on error so it can retry
          autoTriggerAttemptedRef.current = null;
        }
      };

      // Delay to allow loadLatestQualityAnalysis to complete and update state
      // This prevents race condition where auto-trigger fires before existing analysis loads
      const timeoutId = setTimeout(triggerAnalysis, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [cvId, currentCV?.is_parsed, currentCV?.is_imported, qualityAnalysis, analysisLoading, generateQualityAnalysis, addTask, activeTasks, currentCV?.updated_at]);


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Mobile: toggle bar to switch between sidebar and CV content */}
        {isMobile && (
          <CVEditorMobileBar
            mobilePanel={mobilePanel}
            onToggle={() =>
              setMobilePanel((p) => (p === "sidebar" ? "content" : "sidebar"))
            }
          />
        )}

        {/* Mobile: show one panel; desktop: show both */}
        {(!isMobile || mobilePanel === "sidebar") && (
          <Box
            sx={{
              ...(isMobile && { flex: 1, minHeight: 0, display: "flex" }),
              ...(!isMobile && { flexShrink: 0 }),
            }}
          >
            <SectionManagerSidebar
            sections={sections.items}
            activeId={dragDrop.activeId}
            isDefaultOrder={sections.isDefaultOrder()}
            availableSectionsToAdd={sections.availableToAdd}
            title={title || "Untitled CV"}
            cvId={cvId}
            cvData={cvData}
            onTitleSave={onTitleSave || (async () => {})}
            onToggleVisibility={sections.toggleVisibility}
            onAddNewSection={sections.add}
            onAddCustomSection={sections.addCustomSection}
            onDragStart={dragDrop.onDragStart}
            onDragEnd={dragDrop.onDragEnd}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            onUpdateCV={debugOnUpdateCV}
            onSave={debugOnSave}
            onContentUpdate={(content, sectionType) => {
              if (sectionType === "why_good_fit") {
                // Prevent client-side reconstruction of why_good_fit to avoid 422 validation errors
                // The backend is the source of truth for why_good_fit data structure
                // This prevents sending incomplete objects missing required fields like confidence_score
                console.warn(
                  "onContentUpdate: Skipping why_good_fit reconstruction to prevent validation errors",
                );
                return;
              } else if (
                sectionType &&
                content &&
                (sectionType.includes("skills") ||
                  sectionType.includes("work_experience"))
              ) {
                // Handle adding keywords to various sections
                try {
                  const updatedCvData = { ...cvData };
                  const keyword = content;
                  const suggestedPlacement = sectionType;

                  if (
                    suggestedPlacement.includes("skills section") ||
                    suggestedPlacement.includes("skills")
                  ) {
                    // Handle skills section
                    if (!updatedCvData.skills) {
                      updatedCvData.skills = {
                        technical: [],
                        soft: [],
                        languages: [],
                      };
                    }
                    if (!updatedCvData.skills.technical)
                      updatedCvData.skills.technical = [];
                    if (!updatedCvData.skills.soft)
                      updatedCvData.skills.soft = [];
                    if (!updatedCvData.skills.languages)
                      updatedCvData.skills.languages = [];

                    // Check if keyword already exists to avoid duplicates
                    const alreadyExists =
                      updatedCvData.skills.technical.includes(keyword) ||
                      updatedCvData.skills.soft.includes(keyword) ||
                      updatedCvData.skills.languages.some((lang) =>
                        typeof lang === "string"
                          ? lang === keyword
                          : lang.language === keyword,
                      );

                    if (!alreadyExists) {
                      if (suggestedPlacement.includes("technical")) {
                        updatedCvData.skills.technical.push(keyword);
                      } else if (suggestedPlacement.includes("soft")) {
                        updatedCvData.skills.soft.push(keyword);
                      } else {
                        // Default to technical skills
                        updatedCvData.skills.technical.push(keyword);
                      }
                    }

                    // Ensure skills section exists in section config
                    if (!sections.items.find((s) => s.type === "skills")) {
                      const maxOrder =
                        sections.items.length > 0
                          ? Math.max(...sections.items.map((s) => s.order))
                          : -1;
                      const newSection = {
                        id: "skills",
                        type: "skills" as const,
                        title: "Skills",
                        visible: true,
                        order: maxOrder + 1,
                      };

                      const updatedSections = [...sections.items, newSection];
                      updatedCvData.section_config = {
                        sections: updatedSections,
                      };
                    }

                    onUpdateCV(updatedCvData);
                    onSave(updatedCvData, `Added "${keyword}" to skills`);
                  } else if (
                    suggestedPlacement.includes("work_experience") ||
                    suggestedPlacement.includes("work experience")
                  ) {
                    // Handle work experience - add to the most recent job
                    if (
                      updatedCvData.work_experience &&
                      updatedCvData.work_experience.length > 0
                    ) {
                      const mostRecentJob = updatedCvData.work_experience[0];
                      if (
                        mostRecentJob.description &&
                        !mostRecentJob.description
                          .toLowerCase()
                          .includes(keyword.toLowerCase())
                      ) {
                        mostRecentJob.description = `${mostRecentJob.description} ${keyword}`;
                      } else if (!mostRecentJob.description) {
                        mostRecentJob.description = `Worked with ${keyword} technologies.`;
                      }

                      onUpdateCV(updatedCvData);
                      onSave(
                        updatedCvData,
                        `Added "${keyword}" to work experience`,
                      );
                    } else {
                      // No work experience, add to skills instead
                      if (!updatedCvData.skills) {
                        updatedCvData.skills = {
                          technical: [],
                          soft: [],
                          languages: [],
                        };
                      }
                      if (!updatedCvData.skills.technical)
                        updatedCvData.skills.technical = [];

                      if (!updatedCvData.skills.technical.includes(keyword)) {
                        updatedCvData.skills.technical.push(keyword);
                      }

                      onUpdateCV(updatedCvData);
                      onSave(
                        updatedCvData,
                        `Added "${keyword}" to skills (no work experience found)`,
                      );
                    }
                  }
                } catch (error) {
                  // Silently handle errors - user will be notified by other mechanisms
                  console.debug("Error in PDF CV editor:", error);
                }
              }
            }}
          />
          </Box>
        )}

        {(!isMobile || mobilePanel === "content") && (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <CVContentArea cvId={cvId} />
          </Box>
        )}

          {/* Dialogs */}
          <PDFCVEditorDialogs
            showResetDialog={reset.showDialog}
            showUnsavedChangesDialog={changes.showDialog}
            pendingChanges={changes.pendingChanges}
            onCloseResetDialog={reset.onCloseDialog}
            onConfirmReset={reset.onConfirmReset}
            onCloseUnsavedChangesDialog={changes.onCloseDialog}
            onConfirmUnsavedChanges={changes.onConfirmDialog}
            customSectionTitles={
              cvData?.custom_sections?.length
                ? Object.fromEntries(
                    cvData.custom_sections.map((s) => [s.id, s.title ?? s.id]),
                  )
                : undefined
            }
          />

          {/* History Panel */}
          {import.meta.env.VITE_SHOW_HISTORY_PANEL === "true" && cvId && (
            <ConnectedHistoryPanel cvId={cvId} />
          )}

          {/* History Panel Handle - Always visible when panel is closed */}
          {import.meta.env.VITE_SHOW_HISTORY_PANEL === "true" && cvId && (
            <ConnectedHistoryPanelHandle cvId={cvId} />
          )}
        </Box>
    </LocalizationProvider>
  );
};

export default PDFCVEditor;
export type { PDFCVEditorProps };
