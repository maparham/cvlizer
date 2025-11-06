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
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CVSection } from "../../../types";
import SortableSectionItem from "./SortableSectionItem";
import { AVAILABLE_SECTIONS } from "../constants";
import { EditableTitle } from "../EditableTitle";
import { JobDescriptionSummary } from "../ai";
import { useAISuggestionsStore } from "../../../stores/aiSuggestionsStore";
import { useAITaskPollingContext } from "../../../contexts/AITaskPollingContext";
import { useActiveJobDescription, useAIStore, useCVDrafts } from "../../../stores/ai";
import { useNotifications } from "../../../packages/notifications";
import { useCVStore } from "../../../stores/cv";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { setFaviconBadge, clearFaviconBadge, isPageHidden as isFaviconPageHidden } from "../../../utils/faviconBadge";
import { setTitleNotification, clearTitleNotification } from "../../../utils/titleNotification";

interface SectionManagerSidebarProps {
  sections: CVSection[];
  activeId: string | null;
  isDefaultOrder: boolean;
  availableSectionsToAdd: any[];
  title: string;
  cvId?: string;
  cvData?: any;
  onTitleSave: (_newTitle: string) => Promise<void>;
  onToggleVisibility: (_sectionId: string) => void;
  onAddNewSection: (_sectionId: string) => void;
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
  const activeJobDescription = useActiveJobDescription();
  const prevJobDescriptionId = useRef<string | undefined>(
    activeJobDescription?.id,
  );

  // Get existing drafts for the current CV
  const existingDrafts = useCVDrafts(cvId || "");

  // Use refs to prevent effect dependency loops
  const suggestionsLoadingRef = useRef(suggestionsLoading);
  const allSuggestionsRef = useRef(allSuggestions);
  const showInfoRef = useRef(showInfo);
  const getCVDraftsRef = useRef(getCVDrafts);
  const removeTaskRef = useRef(removeTask);
  const setSuggestionsLoadingRef = useRef(setSuggestionsLoading);
  // Track tasks we've already shown completion toast for
  const completedTasksRef = useRef<Set<string>>(new Set());

  // Sync refs with latest values
  useEffect(() => {
    suggestionsLoadingRef.current = suggestionsLoading;
    allSuggestionsRef.current = allSuggestions;
    showInfoRef.current = showInfo;
    getCVDraftsRef.current = getCVDrafts;
    removeTaskRef.current = removeTask;
    setSuggestionsLoadingRef.current = setSuggestionsLoading;
  }, [suggestionsLoading, allSuggestions, showInfo, getCVDrafts, removeTask, setSuggestionsLoading]);

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

  // Monitor global polling tasks for AI enhancements and restore button state
  useEffect(() => {
    // Check if there's an active generating task for this CV and restore button state
    const hasGeneratingTask = Array.from(activeTasks.values()).some(
      (task) =>
        task.type === "ai_enhancement" &&
        task.cvId === cvId &&
        task.isGenerating,
    );

    if (hasGeneratingTask && !suggestionsLoadingRef.current) {
      setSuggestionsLoadingRef.current(true);
    }

    // Check for completed AI enhancement tasks
    const tasksToRemove: string[] = [];
    for (const [taskId, task] of activeTasks) {
      if (
        task.type === "ai_enhancement" &&
        task.cvId === cvId &&
        !task.isGenerating
      ) {
        if (task.generationError) {
          // Clear loading state on error
          setSuggestionsLoadingRef.current(false);
        } else {
          // Task completed successfully
          // Use task.data directly since allSuggestionsRef might not be updated yet
          const enhancementData = task?.data?.enhancement_data;
          const suggestions = enhancementData || allSuggestionsRef.current;
          const hasAnySuggestions =
            suggestions &&
            ((suggestions.skills?.technical?.length > 0) ||
             (suggestions.skills?.soft?.length > 0) ||
             (suggestions.professional_summary?.suggested_text?.trim().length > 0));

          // Show completion toast if we haven't shown it for this task yet
          if (!completedTasksRef.current.has(taskId)) {
            if (!hasAnySuggestions) {
              // Suggestions completed but are empty - inform the user
              showInfoRef.current(
                "No suggestions available. Please add more content to your CV (work experience, skills, professional summary) to get AI-powered enhancement suggestions."
              );
            } else {
              // Show "completed" toast for successful generation
              showInfoRef.current("AI enhancement completed", "Suggestions are ready to review");
            }

            // If page is hidden, show favicon badge and title notification
            if (hasAnySuggestions && isFaviconPageHidden()) {
              setFaviconBadge(1).catch(err =>
                console.error("Failed to set favicon badge:", err)
              );
              setTitleNotification("AI suggestions ready");
            }

            completedTasksRef.current.add(taskId);
          }

          // Ensure loading state is cleared when task completes
          if (suggestionsLoadingRef.current) {
            setSuggestionsLoadingRef.current(false);
          }
          // If backend provided a draft_id via enhancement meta, refresh drafts
          const draftId = task?.data?.enhancement_data?.meta?.draft_id;
          if (cvId && draftId) {
            getCVDraftsRef.current(cvId);
          }
        }

        // Mark for removal after effect to avoid nested update loops
        tasksToRemove.push(taskId);
      }
    }
    if (tasksToRemove.length > 0) {
      // Defer removals to next macrotask to prevent immediate re-entry of this effect
      setTimeout(() => {
        tasksToRemove.forEach((id) => {
          removeTaskRef.current(id);
          // Clean up completed tasks tracking
          completedTasksRef.current.delete(id);
        });
      }, 0);
    }
  }, [activeTasks, cvId]);

  // Clear favicon badge and title notification when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to tab, clear badge and title
        clearFaviconBadge();
        clearTitleNotification();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
      (allSuggestions.work_experience?.length || 0) +
      (allSuggestions.education?.length || 0)
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
        height: "100vh",
        maxHeight: "100vh",
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
          pb: 4,
          height: "calc(100vh - 140px)",
          maxHeight: "calc(100vh - 140px)",
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
          <>
            <Stack spacing={3}>
              <JobDescriptionSummary
                cvId={cvId}
                cvData={cvData}
                onJobDescriptionSelect={handleJobDescriptionSelect}
                onGenerateSuggestions={handleGenerateSuggestions}
                suggestionsLoading={suggestionsLoading}
                onAddToCV={onContentUpdate}
                countdownSeconds={countdownSeconds}
              />

              {/* Discard All Suggestions Button */}
              {totalSuggestionsCount > 0 && (
                <Alert
                  severity="warning"
                  sx={{
                    "& .MuiAlert-icon": {
                      alignItems: "flex-start",
                      pt: 0.5,
                    },
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      {countdownSeconds !== null && countdownSeconds > 0 ? (
                        <>Please review the suggestions. You can generate new suggestions again in {countdownSeconds}s</>
                      ) : (
                        <>You have {totalSuggestionsCount} AI suggestion{totalSuggestionsCount !== 1 ? "s" : ""} available.</>
                      )}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setDiscardAllDialogOpen(true)}
                      fullWidth
                      sx={{
                        textTransform: "none",
                        borderColor: "#f44336",
                        color: "#f44336",
                        "&:hover": {
                          borderColor: "#d32f2f",
                          backgroundColor: "#ffebee",
                        },
                      }}
                    >
                      Discard All Suggestions
                    </Button>
                  </Box>
                </Alert>
              )}
            </Stack>
          </>
        )}
      </Box>

      {/* Discard All Suggestions Confirmation Dialog */}
      <Dialog
        open={discardAllDialogOpen}
        onClose={() => setDiscardAllDialogOpen(false)}
      >
        <DialogTitle>Discard All Suggestions?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to discard all {totalSuggestionsCount} AI suggestion{totalSuggestionsCount !== 1 ? "s" : ""}?
            This action cannot be undone and will remove suggestions from all sections (skills, professional summary, work experience, and education).
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardAllDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDiscardAllSuggestions} color="error" variant="contained">
            Discard All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Draft Confirmation Dialog - Ask to discard existing drafts before regenerating */}
      <Dialog
        open={draftConfirmationDialogOpen}
        onClose={() => setDraftConfirmationDialogOpen(false)}
        aria-labelledby="draft-confirmation-dialog-title"
        aria-describedby="draft-confirmation-dialog-description"
      >
        <DialogTitle id="draft-confirmation-dialog-title">
          Discard Existing Draft Suggestions?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="draft-confirmation-dialog-description">
            Discard existing draft suggestions and generate new ones?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDraftConfirmationDialogOpen(false)}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDiscardAndRegenerate}
            color="primary"
            variant="contained"
          >
            Discard & Regenerate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inline Save Status Footer */}
      <Box
        sx={{
          borderTop: "1px solid #e0e0e0",
          p: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 1,
          bgcolor: "#fafafa",
        }}
      >
        {saving ? (
          <>
            <CircularProgress size={14} sx={{ color: "#616161" }} />
            <Typography variant="caption" sx={{ color: "#616161" }}>
              Saving...
            </Typography>
          </>
        ) : lastSavedAt ? (
          <>
            <CheckCircleOutlineIcon fontSize="small" sx={{ color: "#2e7d32" }} />
            <Typography variant="caption" sx={{ color: "#2e7d32" }}>
              Saved {relativeSavedText}
            </Typography>
          </>
        ) : (
          <></>
        )}
      </Box>
    </Paper>
  );
};

export default SectionManagerSidebar;
