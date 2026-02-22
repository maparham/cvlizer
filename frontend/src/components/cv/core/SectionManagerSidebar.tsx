/**
 * Section Manager Sidebar Component
 *
 * This module provides the sidebar interface for CV section management including:
 * - Section visibility toggles (show/hide sections)
 * - Drag and drop reordering of CV sections
 * - Add new sections functionality
 * - Reset to default order option
 * - Visual indicators for section states and order changes
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Paper,
  Typography,
  Button,
  Tooltip,
  Card,
  CardContent,
  Box,
  List,
  Tabs,
  Tab,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CVSection, CVData } from "../../../types";
import SortableSectionItem from "./SortableSectionItem";
import { AVAILABLE_SECTIONS } from "../constants";
import { EditableTitle } from "../EditableTitle";
import { CVEditionSidebarContent } from "./CVEditionSidebarContent";
import { SectionManagerDialogs } from "./SectionManagerDialogs";
import { SectionManagerSaveFooter } from "./SectionManagerSaveFooter";
import { useAIEnhancementPolling, useFaviconVisibilityCleanup } from "../../../hooks/useAIEnhancementPolling";
import { useAISuggestionsStore } from "../../../stores/aiSuggestionsStore";
import { useAITaskPollingContext } from "../../../contexts/AITaskPollingContext";
import { useActiveJobDescription, useAIStore, useCVDrafts } from "../../../stores/ai";
import { useNotifications } from "../../../packages/notifications";
import { useCVStore } from "../../../stores/cv";
import { useCVQualityStore } from "../../../stores/cvQualityStore";

interface SectionManagerSidebarProps {
  sections: CVSection[];
  activeId: string | null;
  isDefaultOrder: boolean;
  availableSectionsToAdd: any[];
  title: string;
  cvId?: string;
  cvData?: CVData;
  onTitleSave: (_newTitle: string) => Promise<void>;
  onToggleVisibility: (_sectionId: string) => void;
  onAddNewSection: (_sectionId: string) => void;
  onAddCustomSection?: () => void;
  onDragStart: (_event: any) => void;
  onDragEnd: (_event: any) => void;
  onContentUpdate?: (content: string, sectionType: string) => void;
  activeTab?: number;
  onTabChange?: (tab: number) => void;
}

const SectionManagerSidebar: React.FC<SectionManagerSidebarProps> = ({
  sections,
  activeId,
  availableSectionsToAdd,
  title,
  cvId,
  cvData,
  onTitleSave,
  onToggleVisibility,
  onAddNewSection,
  onAddCustomSection,
  onDragStart,
  onDragEnd,
  onContentUpdate,
  activeTab: externalActiveTab,
  onTabChange,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(0);
  const activeTab =
    externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const [discardAllDialogOpen, setDiscardAllDialogOpen] = useState(false);
  const [draftConfirmationDialogOpen, setDraftConfirmationDialogOpen] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // AI Suggestions store
  const {
    allSuggestions,
    suggestionsLoading,
    generateAllSuggestions,
    clearAllSuggestions,
    setSuggestionsLoading,
    dismissAllSuggestions,
  } = useAISuggestionsStore();

  // Global polling context
  const { addTask, removeTask, activeTasks } = useAITaskPollingContext();

  // AI store for job description management
  const setActiveJobDescription = useAIStore((state) => state.setActiveJobDescription);
  const getCVDrafts = useAIStore((state) => state.getCVDrafts);
  const deleteWhyGoodFitDraft = useAIStore((state) => state.deleteWhyGoodFitDraft);

  // Notifications for error and success handling
  const { showInfo, showError } = useNotifications();

  // Active job description from existing AI store
  const activeJobDescription = useActiveJobDescription(cvId || "");

  // Gate: disable job fit and coaching until proofread score is at least 80 (file-parsed CVs only).
  // Check currentCV?.id === cvId so we don't mix metadata from a different CV during navigation.
  const currentCV = useCVStore((state) => state.currentCV);
  const proofreadScore = useCVQualityStore((state) => state.proofreadScore);
  const qualityStoreCvId = useCVQualityStore((state) => state.currentCvId);
  const overallScore = useCVQualityStore((state) =>
    state.currentCvId === cvId ? state.overallScore : null
  );
  const analysisLoading = useCVQualityStore((state) =>
    state.currentCvId === cvId ? state.analysisLoading : false
  );
  const dismissAllQualitySuggestions = useCVQualityStore(
    (state) => state.dismissAllQualitySuggestions,
  );
  const isProofreadGateActive =
    currentCV?.id === cvId &&
    currentCV?.is_imported === true &&
    (qualityStoreCvId !== cvId || proofreadScore === null || proofreadScore < 80);

  // Derive suggestionsLoading from activeTasks so it survives page reload
  const hasGeneratingEnhancementTask = useMemo(
    () =>
      cvId &&
      Array.from(activeTasks.values()).some(
        (t) =>
          t.type === "ai_enhancement" &&
          t.cvId === cvId &&
          t.isGenerating,
      ),
    [activeTasks, cvId]
  );
  const suggestionsLoadingEffective = suggestionsLoading || !!hasGeneratingEnhancementTask;

  const prevJobDescriptionId = useRef<string | undefined>(
    activeJobDescription?.id,
  );

  // Get existing drafts for the current CV
  const existingDrafts = useCVDrafts(cvId || "");

  useAIEnhancementPolling({
    cvId,
    activeTasks,
    allSuggestions,
    suggestionsLoading: suggestionsLoadingEffective,
    showError,
    showInfo,
    setSuggestionsLoading,
    getCVDrafts,
    removeTask,
  });
  useFaviconVisibilityCleanup();

  // Handle job description selection
  const handleJobDescriptionSelect = useCallback(
    (jobDescription: any) => {
      if (cvId) {
        if (jobDescription) {
          setActiveJobDescription(jobDescription.id, cvId);
        } else {
          setActiveJobDescription(undefined, cvId);
        }
      }
    },
    [setActiveJobDescription, cvId],
  );

  // Proceed with AI generation after draft confirmation or if no drafts exist
  const proceedWithGeneration = useCallback(async () => {
    if (!activeJobDescription || !cvId) return;

    try {
      // Note: Draft deletion is handled in handleConfirmDiscardAndRegenerate
      // No need to delete drafts here as they're already deleted before this is called

      // Reset countdown when starting new generation
      setCountdownSeconds(null);

      // Create AI enhancement task using background task API
      const enhancementId = await generateAllSuggestions(
        cvId,
        activeJobDescription.id,
      );

      if (enhancementId) {
        // Add the task to global polling system
        addTask({
          id: enhancementId,
          type: "ai_enhancement",
          cvId: cvId,
          isGenerating: true,
        });

        // Show "started" toast
        showInfo("AI enhancement started", "Generating personalized suggestions...", true);
      }
    } catch (error) {
      // ErrorHandler.handle() is called in aiSuggestionsStore which handles the notification
      // Just update local state, don't duplicate error notification
      setSuggestionsLoading(false);
    }
  }, [
    activeJobDescription,
    cvId,
    generateAllSuggestions,
    addTask,
    setSuggestionsLoading,
    showInfo,
  ]);

  // Handle generating AI suggestions
  const handleGenerateSuggestions = useCallback(async () => {
    if (activeJobDescription && cvId) {
      // Check if there are existing drafts using the hook result from component level
      // existingDrafts is already computed at the component level
      if (existingDrafts && existingDrafts.length > 0) {
        // Show confirmation dialog
        setDraftConfirmationDialogOpen(true);
        return;
      }

      // No drafts exist, proceed with generation
      await proceedWithGeneration();
    }
  }, [
    activeJobDescription,
    cvId,
    existingDrafts,
    proceedWithGeneration,
  ]);

  // Handler for dismissing all suggestions
  const handleDiscardAllSuggestions = useCallback(async () => {
    try {
      // Delete why_good_fit draft if it exists
      if (cvId) {
        try {
          await deleteWhyGoodFitDraft(cvId);
        } catch (draftError: any) {
          // Log but don't fail the entire operation if draft deletion fails
          console.warn("Failed to delete why_good_fit draft:", draftError);
        }
      }

      await dismissAllSuggestions();
      setDiscardAllDialogOpen(false);
      setCountdownSeconds(null); // Reset countdown when suggestions are discarded
      showInfo("All suggestions have been discarded");
    } catch (error: any) {
      showError(
        error?.message || "Failed to discard suggestions. Please try again."
      );
    }
  }, [cvId, deleteWhyGoodFitDraft, dismissAllSuggestions, showInfo, showError]);

  // Handle draft confirmation - delete drafts and proceed with generation
  const handleConfirmDiscardAndRegenerate = useCallback(async () => {
    if (!cvId) return;

    try {
      // Close dialog first
      setDraftConfirmationDialogOpen(false);

      // Use existing discard logic that properly handles UI updates
      await handleDiscardAllSuggestions();

      // Proceed with generation
      await proceedWithGeneration();
    } catch (error: any) {
      showError(
        error?.message || "Failed to discard drafts. Please try again."
      );
    }
  }, [cvId, handleDiscardAllSuggestions, proceedWithGeneration, showError]);

  // Clear suggestions when job description changes (only when switching between different JDs)
  useEffect(() => {
    const currentId = activeJobDescription?.id;
    // Only clear if we're switching from one job description to another
    // Don't clear on initial load (undefined -> job description) or when unselecting (job description -> undefined)
    if (
      currentId !== prevJobDescriptionId.current &&
      prevJobDescriptionId.current !== undefined &&
      currentId !== undefined
    ) {
      clearAllSuggestions();
    }
    prevJobDescriptionId.current = currentId;
  }, [activeJobDescription?.id, clearAllSuggestions]);

  // Subscribe to saving state and lastSavedAt reactively
  const { saving, lastSavedAt } = useCVStore((s) => ({
    saving: s.saving,
    lastSavedAt: s.lastSavedAt,
  }));

  // Compute relative time string such as "10s ago", "2m ago", "1h ago"
  const formatRelativeTime = useCallback((isoString?: string | null) => {
    if (!isoString) return "";
    const savedTime = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - savedTime);
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  // Ticker to refresh relative time periodically
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => (t + 1) % 1000), 5000);
    return () => clearInterval(interval);
  }, []);

  const relativeSavedText = useMemo(() => formatRelativeTime(lastSavedAt), [lastSavedAt, tick, formatRelativeTime]);

  // Memoize tab change handler to prevent Tabs re-render loop
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    if (onTabChange) {
      onTabChange(newValue);
    } else {
      setInternalActiveTab(newValue);
    }
  }, [onTabChange]);

  // Calculate total suggestions count
  const totalSuggestionsCount = useMemo(() => {
    if (!allSuggestions) return 0;
    return (
      (allSuggestions.skills?.technical?.length || 0) +
      (allSuggestions.skills?.soft?.length || 0) +
      (allSuggestions.professional_summary?.suggested_text?.trim() ? 1 : 0) +
      (allSuggestions.work_experience?.filter((s) => s.suggested).length || 0) +
      (allSuggestions.education?.filter((s) => s.suggested).length || 0)
    );
  }, [allSuggestions]);

  // Track previous suggestions count to detect when suggestions are first generated
  const prevSuggestionsCountRef = useRef<number>(0);

  // Start countdown when suggestions are first generated
  useEffect(() => {
    const prevCount = prevSuggestionsCountRef.current;
    const currentCount = totalSuggestionsCount;

    // Detect transition from 0 to > 0 (suggestions just appeared)
    if (prevCount === 0 && currentCount > 0) {
      setCountdownSeconds(20);
    }

    // Reset countdown if suggestions are cleared
    if (currentCount === 0) {
      setCountdownSeconds(null);
    }

    prevSuggestionsCountRef.current = currentCount;
  }, [totalSuggestionsCount]);

  // Countdown timer effect
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownSeconds]);

  // Calculate AppBar height - matches CVEditorHeader's Toolbar minHeight (64px)
  // Using theme.mixins.toolbar for maintainability, with fallback to match actual AppBar
  const theme = useTheme();
  const toolbarHeight =
    (theme.mixins.toolbar as { minHeight?: number })?.minHeight ?? 64;

  return (
    <Paper
      sx={{
        width: 350,
        p: 0,
        overflow: "hidden",
        border: "none",
        boxShadow: "none",
        borderRight: "1px solid #e0e0e0",
        display: "flex",
        flexDirection: "column",
        height: `calc(100vh - ${toolbarHeight}px)`,
        maxHeight: `calc(100vh - ${toolbarHeight}px)`,
      }}
    >
      {/* CV Title - At the top */}
      <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
        <EditableTitle
          title={title}
          onSave={onTitleSave}
          variant="h6"
          sx={{
            width: "100%",
            "& .MuiTypography-root": {
              color: "#333",
              fontSize: "1.1rem",
              fontWeight: 500,
            },
          }}
        />
      </Box>

      {/* Tabs for different views */}
      <Box sx={{ borderBottom: "1px solid #e0e0e0" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab
            label="Sections"
            icon={<EditIcon />}
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
          {cvId && (
            <Tab
              label="AI Tools"
              icon={<AutoAwesomeIcon />}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
          )}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
          scrollBehavior: "smooth",
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#f1f1f1",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#c1c1c1",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "#a8a8a8",
          },
        }}
      >
        {activeTab === 0 && (
          <>
            <Typography
              variant="body2"
              sx={{ color: "#666", mb: 2, fontStyle: "italic" }}
            >
              Drag sections to reorder them
            </Typography>

            <DndContext
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <List>
                  {sections
                    .filter((section) => section.visible)
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (
                      <SortableSectionItem
                        key={section.id}
                        section={section}
                        onToggleVisibility={onToggleVisibility}
                      />
                    ))}
                </List>
              </SortableContext>
              <DragOverlay>
                {activeId ? (
                  <SortableSectionItem
                    section={sections.find((s) => s.id === activeId)!}
                    onToggleVisibility={() => {}}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Hidden Sections */}
            {sections.filter((section) => !section.visible).length > 0 && (
              <>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", mt: 3, mb: 2, color: "#666" }}
                >
                  Hidden Sections
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {sections
                    .filter((section) => !section.visible)
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (
                      <Card
                        key={section.id}
                        sx={{
                          border: "1px solid #e0e0e0",
                          bgcolor: "#f5f5f5",
                          "&:hover": {
                            borderColor: "#1976d2",
                            boxShadow: 1,
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                flexGrow: 1,
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{ mr: 1.5, flexShrink: 0 }}
                              >
                                {AVAILABLE_SECTIONS.find(
                                  (s) => s.id === section.id,
                                )?.icon || "📄"}
                              </Typography>
                              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 400,
                                    fontSize: "0.8rem",
                                    lineHeight: 1.2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {section.title}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.75rem" }}
                                >
                                  Content preserved
                                </Typography>
                              </Box>
                            </Box>
                            <Tooltip title="Restore this section">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => onAddNewSection(section.id)}
                                data-testid={`add-section-${section.id}-button`}
                                sx={{
                                  ml: 1.5,
                                  minWidth: "auto",
                                  px: 0.5,
                                  flexShrink: 0,
                                }}
                              >
                                <AddIcon fontSize="small" />
                              </Button>
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                </Box>
              </>
            )}

            {/* Available Sections */}
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: "bold", mt: 3, mb: 2, color: "#666" }}
            >
              Available Sections ({availableSectionsToAdd.length})
            </Typography>
            {/* Add custom section: placed here so it stays visible when viewing predefined sections */}
            {onAddCustomSection && (
              <Box sx={{ mb: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={onAddCustomSection}
                  data-testid="add-custom-section-button"
                  sx={{ py: 1.5 }}
                >
                  Add custom section
                </Button>
              </Box>
            )}
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 4 }}
            >
              {availableSectionsToAdd.length > 0 ? (
                availableSectionsToAdd.map((section) => (
                  <Card
                    key={section.id}
                    sx={{
                      border: "1px solid #e0e0e0",
                      "&:hover": {
                        borderColor: "#1976d2",
                        boxShadow: 1,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            flexGrow: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ mr: 1.5, flexShrink: 0 }}
                          >
                            {section.icon}
                          </Typography>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.8rem",
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {section.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.75rem" }}
                            >
                              {section.description}
                            </Typography>
                          </Box>
                        </Box>
                        <Tooltip title="Add this section to your CV">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onAddNewSection(section.id)}
                            data-testid={`add-section-${section.id}-button`}
                            sx={{
                              ml: 1.5,
                              minWidth: "auto",
                              px: 0.5,
                              flexShrink: 0,
                            }}
                          >
                            <AddIcon fontSize="small" />
                          </Button>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", textAlign: "center", py: 2 }}
                >
                  No available sections to add (all sections already present)
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* AI Tools Tab */}
        {activeTab === 1 && cvId && (
          <CVEditionSidebarContent
            cvId={cvId}
            cvData={cvData}
            proofreadGateActive={isProofreadGateActive}
            step3Props={{
              onGenerateSuggestions: handleGenerateSuggestions,
              suggestionsLoading: suggestionsLoadingEffective,
              activeJobDescription: activeJobDescription ?? null,
              countdownSeconds: countdownSeconds ?? null,
              cvData,
            }}
            onJobDescriptionSelect={handleJobDescriptionSelect}
            onContentUpdate={onContentUpdate}
            overallScore={overallScore}
            analysisLoading={analysisLoading}
            dismissAllQualitySuggestions={dismissAllQualitySuggestions}
            totalSuggestionsCount={totalSuggestionsCount}
            onOpenDiscardAllDialog={() => setDiscardAllDialogOpen(true)}
          />
        )}
      </Box>

      <SectionManagerDialogs
        discardAllDialogOpen={discardAllDialogOpen}
        onCloseDiscardAll={() => setDiscardAllDialogOpen(false)}
        onConfirmDiscardAll={handleDiscardAllSuggestions}
        draftConfirmationDialogOpen={draftConfirmationDialogOpen}
        onCloseDraftConfirmation={() => setDraftConfirmationDialogOpen(false)}
        onConfirmDiscardAndRegenerate={handleConfirmDiscardAndRegenerate}
        totalSuggestionsCount={totalSuggestionsCount}
      />

      <SectionManagerSaveFooter
        saving={saving}
        lastSavedAt={lastSavedAt}
        relativeSavedText={relativeSavedText}
      />
    </Paper>
  );
};

export default SectionManagerSidebar;
