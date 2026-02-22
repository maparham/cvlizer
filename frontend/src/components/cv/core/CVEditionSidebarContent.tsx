/**
 * CV Edition Sidebar Content
 *
 * Renders the AI Tools tab content: CVQualityPanel, JobDescriptionSummary,
 * Clear-all button, SuggestionsSidebar, and Discard-all Alert.
 * Extracted from SectionManagerSidebar to reduce its size and separate concerns.
 */

import React from "react";
import { Box, Button, Typography, Stack, Alert } from "@mui/material";
import { ClearAll as ClearAllIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { JobDescriptionSummary } from "../ai";
import { CVQualityPanel } from "../ai/CVQualityPanel";
import SuggestionsSidebar from "../ai/SuggestionsSidebar";
import type { CVData } from "../../../types";
import type { JobDescription } from "../../../types/ai";

export interface CVEditionSidebarContentProps {
  cvId: string;
  cvData?: CVData;
  proofreadGateActive: boolean;
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
  proofreadGateActive,
  step3Props,
  onJobDescriptionSelect,
  onContentUpdate,
  overallScore,
  analysisLoading,
  dismissAllQualitySuggestions,
  totalSuggestionsCount,
  onOpenDiscardAllDialog,
}) => {
  return (
    <Stack spacing={3}>
      <CVQualityPanel
        cvId={cvId}
        proofreadGateActive={proofreadGateActive}
        step3Props={step3Props}
      />

      <JobDescriptionSummary
        cvId={cvId}
        cvData={cvData}
        onJobDescriptionSelect={onJobDescriptionSelect}
        suggestionsLoading={step3Props.suggestionsLoading}
        onAddToCV={onContentUpdate}
      />

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

      {(totalSuggestionsCount > 0 || cvId) && (
        <SuggestionsSidebar
          cvData={cvData}
          cvId={cvId}
          proofreadGateActive={proofreadGateActive}
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
    </Stack>
  );
};
