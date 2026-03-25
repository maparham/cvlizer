/**
 * CV Edition Sidebar Content
 *
 * Renders the AI Tools tab content: sub-tabs (Fix spelling / Improve style / Enhance for job),
 * CVQualityPanel per sub-tab. SuggestionsSidebar (navigation list) is shown on all three sub-tabs.
 * "Clear all suggestions" is shown on all tabs when overallScore !== null. JobDescriptionSummary and Discard-all Alert are shown only on the Enhance-for-job sub-tab.
 */

import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import DeleteIcon from "@mui/icons-material/Delete";
import SpellcheckIcon from "@mui/icons-material/Spellcheck";
import EditNoteIcon from "@mui/icons-material/EditNote";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import { JobDescriptionSummary } from "../ai";
import { CVQualityPanel } from "../ai/CVQualityPanel";
import SuggestionsSidebar from "../ai/SuggestionsSidebar";
import { TabWithBadge } from "./TabWithBadge";
import { useUIStore, clampAIToolsSubTab } from "../../../stores/uiStore";
import { useCVQualityStore } from "../../../stores/cvQualityStore";
import { getTotalQualityIssueCount } from "../../../hooks/useQualityNavigation";
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
  const qualityAnalysis = useCVQualityStore((s) =>
    s.currentCvId === cvId ? s.qualityAnalysis : null
  );
  const currentCorrectionMode = useCVQualityStore((s) =>
    s.currentCvId === cvId ? s.currentCorrectionMode : null
  );
  const totalQualityIssueCount = getTotalQualityIssueCount(qualityAnalysis, cvData);
  const isProofread = qualityAnalysis?.correction_mode === "proofread";
  const isCoaching = qualityAnalysis?.correction_mode === "coaching";
  const qualityCountTab0 = isProofread ? totalQualityIssueCount : 0;
  const qualityCountTab1 = isCoaching ? totalQualityIssueCount : 0;

  const loadingTab0 = analysisLoading && currentCorrectionMode === "proofread";
  const loadingTab1 = analysisLoading && currentCorrectionMode === "coaching";
  const loadingTab2 = step3Props.suggestionsLoading;

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
            icon={
              <TabWithBadge
                tooltipTitle={
                  loadingTab0
                    ? "Analyzing spelling and grammar..."
                    : qualityCountTab0 > 0
                      ? `${qualityCountTab0} spelling and grammar correction${qualityCountTab0 !== 1 ? "s" : ""}`
                      : "Fix spelling and grammar"
                }
                loading={loadingTab0}
                count={qualityCountTab0}
                icon={<SpellcheckIcon />}
              />
            }
            iconPosition="start"
            aria-label="Fix spelling and grammar"
            id="ai-subtab-0"
            aria-controls="ai-subtabpanel-0"
          />
          <Tab
            icon={
              <TabWithBadge
                tooltipTitle={
                  loadingTab1
                    ? "Analyzing writing style..."
                    : qualityCountTab1 > 0
                      ? `${qualityCountTab1} writing style issue${qualityCountTab1 !== 1 ? "s" : ""}`
                      : "Improve writing style"
                }
                loading={loadingTab1}
                count={qualityCountTab1}
                icon={<EditNoteIcon />}
              />
            }
            iconPosition="start"
            aria-label="Improve writing style"
            id="ai-subtab-1"
            aria-controls="ai-subtabpanel-1"
          />
          <Tab
            icon={
              <TabWithBadge
                tooltipTitle={
                  loadingTab2
                    ? "Generating job-fit suggestions..."
                    : totalSuggestionsCount > 0
                      ? `${totalSuggestionsCount} job-fit issue${totalSuggestionsCount !== 1 ? "s" : ""}`
                      : "Enhance CV for this Job"
                }
                loading={loadingTab2}
                count={totalSuggestionsCount}
                icon={<WorkOutlineIcon />}
              />
            }
            iconPosition="start"
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

      {/* Intentional: SuggestionsSidebar shows on all tabs for navigation (quality on tabs 0/1, job-fit on tab 2) */}
      <Box
        sx={{
          backgroundColor: "action.hover",
          borderRadius: 2,
          p: 2,
          mt: 1,
        }}
      >
        <SuggestionsSidebar
          cvData={cvData}
          cvId={cvId}
          hideCVQualityPanel
        />
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
