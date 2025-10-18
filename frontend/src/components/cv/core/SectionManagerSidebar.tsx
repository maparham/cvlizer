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
import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { CVSection } from "../../../types";
import SortableSectionItem from "./SortableSectionItem";
import { AVAILABLE_SECTIONS } from "../constants";
import { EditableTitle } from "../EditableTitle";
import { JobDescriptionSummary } from "../ai";
import { useAISuggestionsStore } from "../../../stores/aiSuggestionsStore";
import { useAITaskPollingContext } from "../../../contexts/AITaskPollingContext";
import { useActiveJobDescription, useAIStore } from "../../../stores/aiStore";
import { useNotifications } from "../../../packages/notifications";

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
  cvData: _cvData,
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

  // AI Suggestions store
  const {
    allSuggestions,
    suggestionsLoading,
    generateAllSuggestions,
    clearAllSuggestions,
    setSuggestionsLoading,
  } = useAISuggestionsStore();

  // Global polling context
  const { addTask, removeTask, activeTasks } = useAITaskPollingContext();

  // AI store for job description management
  const { setActiveJobDescription } = useAIStore();

  // Notifications for error and success handling
  const { showError, showInfo } = useNotifications();

  // Active job description from existing AI store
  const activeJobDescription = useActiveJobDescription();
  const prevJobDescriptionId = useRef<string | undefined>(
    activeJobDescription?.id,
  );

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

  // Handle generating AI suggestions
  const handleGenerateSuggestions = useCallback(async () => {
    if (activeJobDescription && cvId) {
      try {
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
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate AI suggestions";
        showError("Error", errorMessage);
        setSuggestionsLoading(false);
      }
    }
  }, [
    activeJobDescription,
    cvId,
    generateAllSuggestions,
    addTask,
    showError,
    setSuggestionsLoading,
  ]);

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

    if (hasGeneratingTask && !suggestionsLoading) {
      setSuggestionsLoading(true);
    }

    // Check for completed AI enhancement tasks
    for (const [taskId, task] of activeTasks) {
      if (
        task.type === "ai_enhancement" &&
        task.cvId === cvId &&
        !task.isGenerating
      ) {
        if (task.generationError) {
          // Clear loading state on error
          setSuggestionsLoading(false);
        } else {
          // Check if suggestions are empty and notify user
          const suggestions = allSuggestions;
          const hasAnySuggestions =
            suggestions &&
            ((suggestions.skills.technical.length > 0) ||
             (suggestions.skills.soft.length > 0) ||
             (suggestions.professional_summary.suggested_text?.trim().length > 0));

          if (!hasAnySuggestions && suggestionsLoading) {
            // Suggestions completed but are empty - inform the user
            showInfo(
              "No suggestions available. Please add more content to your CV (work experience, skills, professional summary) to get AI-powered enhancement suggestions."
            );
          }

          // Ensure loading state is cleared when task completes
          if (suggestionsLoading) {
            setSuggestionsLoading(false);
          }
        }

        // Remove the completed task from global polling
        removeTask(taskId);
      }
    }
  }, [
    activeTasks,
    cvId,
    suggestionsLoading,
    setSuggestionsLoading,
    removeTask,
    allSuggestions,
    showInfo,
  ]);
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
          onChange={(_, newValue) => {
            if (onTabChange) {
              onTabChange(newValue);
            } else {
              setInternalActiveTab(newValue);
            }
          }}
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
                onJobDescriptionSelect={handleJobDescriptionSelect}
                onGenerateSuggestions={handleGenerateSuggestions}
                suggestionsLoading={suggestionsLoading}
                onAddToCV={onContentUpdate}
              />
            </Stack>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default SectionManagerSidebar;
