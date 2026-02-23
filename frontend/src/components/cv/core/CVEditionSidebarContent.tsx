/**
 * CV Edition Sidebar Content
 *
 * Renders the AI Tools tab content: sub-tabs (Fix spelling / Improve style / Enhance for job),
 * CVQualityPanel per sub-tab. "Clear all suggestions" is shown on all tabs when there is a score.
 * JobDescriptionSummary, SuggestionsSidebar, and Discard-all Alert are shown only on the Enhance-for-job sub-tab.
 */

import React from "react";
import { Box, Button, Typography, Stack, Alert, Tabs, Tab } from "@mui/material";
import {
  ClearAll as ClearAllIcon,
  Delete as DeleteIcon,
  Spellcheck as SpellcheckIcon,
  EditNote as EditNoteIcon,
  WorkOutline as WorkOutlineIcon,
} from "@mui/icons-material";
import { JobDescriptionSummary } from "../ai";
import { CVQualityPanel } from "../ai/CVQualityPanel";
import SuggestionsSidebar from "../ai/SuggestionsSidebar";
import { useUIStore, clampAIToolsSubTab } from "../../../stores/uiStore";
import type { CVData } from "../../../types";
import type { JobDescription } from "../../../types/ai";

export interface CVEditionSidebarContentProps {
  cvId: string;
  cvData?: CVData;
  step3Props: {
    onGenerateSuggestions: () => void;
    suggestionsLoading: boolean;
    activeJobDescription: { is_parsing?: boolean } | null;
    countdownSeconds: number | null;
    cvData?: CVData;
  };
  onJobDescriptionSelect: (jobDescription: JobDescription | null) => void;
  onContentUpdate?: (content: string, sectionType: string) => void;
  overallScore: number | null;
  analysisLoading: boolean;
  dismissAllQualitySuggestions: () => Promise<void>;
  totalSuggestionsCount: number;
  onOpenDiscardAllDialog: () => void;
}

export const CVEditionSidebarContent: React.FC<CVEditionSidebarContentProps> = ({
  cvId,
  cvData,
  step3Props,
  onJobDescriptionSelect,
  onContentUpdate,
  overallScore,
  analysisLoading,
  dismissAllQualitySuggestions,
  totalSuggestionsCount,
  onOpenDiscardAllDialog,
}) => {
  const subTabRaw = useUIStore((s) => s.getCVEditorAIToolsSubTab(cvId));
  const subTabIndex = clampAIToolsSubTab(subTabRaw);
  const setSubTabIndex = useUIStore((s) => s.setCVEditorAIToolsSubTab);

  return (
    <Stack spacing={3}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mx: -2, px: 2 }}>
        <Tabs
          value={subTabIndex}
          onChange={(_, v: number) => setSubTabIndex(cvId, clampAIToolsSubTab(v))}
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              minHeight: 48,
              justifyContent: "center",
            },
          }}
        >
          <Tab
            icon={<SpellcheckIcon />}
            aria-label="Fix spelling and grammar"
            id="ai-subtab-0"
            aria-controls="ai-subtabpanel-0"
          />
          <Tab
            icon={<EditNoteIcon />}
            aria-label="Improve writing style"
            id="ai-subtab-1"
            aria-controls="ai-subtabpanel-1"
          />
          <Tab
            icon={<WorkOutlineIcon />}
            aria-label="Enhance CV for this Job"
            id="ai-subtab-2"
            aria-controls="ai-subtabpanel-2"
          />
        </Tabs>
      </Box>

      <Box role="tabpanel" id={`ai-subtabpanel-${subTabIndex}`} aria-labelledby={`ai-subtab-${subTabIndex}`}>
        <CVQualityPanel
          cvId={cvId}
          subTabIndex={subTabIndex}
          step3Props={step3Props}
        />

        {subTabIndex === 2 && (
          <JobDescriptionSummary
            cvId={cvId}
            cvData={cvData}
            onJobDescriptionSelect={onJobDescriptionSelect}
            suggestionsLoading={step3Props.suggestionsLoading}
            onAddToCV={onContentUpdate}
          />
        )}
      </Box>

      {overallScore !== null && (
        <Button
          variant="text"
          color="inherit"
          fullWidth
          size="small"
          startIcon={<ClearAllIcon />}
          onClick={dismissAllQualitySuggestions}
          disabled={analysisLoading}
          sx={{
            textTransform: "none",
            color: "text.secondary",
            "&:hover": {
              color: "text.primary",
            },
          }}
        >
          Clear all suggestions
        </Button>
      )}

      {subTabIndex === 2 && (
        <>
          {(totalSuggestionsCount > 0 || cvId) && (
            <SuggestionsSidebar
              cvData={cvData}
              cvId={cvId}
              hideCVQualityPanel
            />
          )}

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
                  {step3Props.countdownSeconds !== null && step3Props.countdownSeconds > 0 ? (
                    <>Please review the suggestions. You can generate new suggestions again in {step3Props.countdownSeconds}s</>
                  ) : (
                    <>You have {totalSuggestionsCount} AI suggestion{totalSuggestionsCount !== 1 ? "s" : ""} available.</>
                  )}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={onOpenDiscardAllDialog}
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
        </>
      )}
    </Stack>
  );
};
