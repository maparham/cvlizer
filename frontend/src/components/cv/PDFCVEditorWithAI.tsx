/**
 * PDF CV Editor with AI Integration
 *
 * Enhanced version of PDFCVEditor that includes AI suggestion capabilities
 * and inline diff functionality. This component wraps the original editor
 * with the InlineDiffProvider and adds AI-powered suggestion features.
 *
 * Key responsibilities:
 * - Provide AI suggestion generation and management
 * - Integrate inline diff system with CV editing
 * - Handle floating suggestions panel
 * - Manage state between original CV editor and AI features
 * - Coordinate between AI services and CV data updates
 *
 * Usage:
 * - Drop-in replacement for PDFCVEditor when AI features are needed
 * - Maintains full compatibility with original editor functionality
 * - Adds AI suggestions button and floating panel management
 */

import React, { useState, useCallback } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import Snackbar from "@mui/material/Snackbar";
import Tooltip from "@mui/material/Tooltip";
import AutoFixHigh from "@mui/icons-material/AutoFixHigh";
import Close from "@mui/icons-material/Close";
import { InlineDiffProvider } from "../../contexts/InlineDiffContext";
import { FloatingSuggestionsPanel } from "./ai/FloatingSuggestionsPanel";
import { useAIStore, useActiveJobDescription } from "../../stores/ai";
import { useCVEditor } from "../../contexts/CVEditorContext";
import PDFCVEditor from "./PDFCVEditor";

interface PDFCVEditorWithAIProps {
  title?: string;
  onTitleSave?: (newTitle: string) => Promise<void>;
  cvId?: string;
}

const PDFCVEditorWithAI: React.FC<PDFCVEditorWithAIProps> = ({
  title,
  onTitleSave,
  cvId,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { cvData, onUpdateCV, onSave, validationErrors } = useCVEditor();
  // const jobDescriptions = useJobDescriptions(); // Unused variable removed
  const activeJobDescription = useActiveJobDescription(cvId || "");
  const { generateInlineSuggestions, applyAllSuggestions } = useAIStore();

  const handleGenerateAISuggestions = useCallback(async () => {
    if (!cvId) {
      setError("CV ID is required to generate AI suggestions");
      return;
    }

    if (!activeJobDescription) {
      setError(
        "Please select a job description first to generate targeted suggestions",
      );
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Generate suggestions based on active job description
      await generateInlineSuggestions(cvId, activeJobDescription.id);

      // Apply all suggestions to create temp state
      applyAllSuggestions(cvData, cvId);
    } catch (err) {
      console.error("Error generating AI suggestions:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate AI suggestions",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    cvId,
    activeJobDescription,
    cvData,
    generateInlineSuggestions,
    applyAllSuggestions,
  ]);

  const handleNavigateToSuggestion = useCallback(
    (suggestion: { section: string }) => {
      // Scroll to the relevant section
      const sectionElement = document.querySelector(
        `[data-section="${suggestion.section}"]`,
      );
      if (sectionElement) {
        sectionElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Add a temporary highlight effect
        sectionElement.classList.add("highlighted-section");
        setTimeout(() => {
          sectionElement.classList.remove("highlighted-section");
        }, 2000);
      }
    },
    [],
  );

  // Unused function removed for cleanup

  const canGenerateSuggestions = !!(
    cvId &&
    activeJobDescription &&
    !isGenerating &&
    validationErrors.length === 0
  );

  return (
    <InlineDiffProvider>
      <Box sx={{ position: "relative", height: "100vh" }}>
          {/* Main CV Editor */}
          <PDFCVEditor title={title} onTitleSave={onTitleSave} cvId={cvId} />

        {/* AI Suggestions FAB */}
        <Tooltip
          title={
            !cvId
              ? "Save CV first to enable AI suggestions"
              : !activeJobDescription
                ? "Select a job description to generate targeted suggestions"
              : validationErrors.length > 0
                ? "Please fix validation errors before generating AI suggestions"
                : "Generate AI suggestions"
          }
          placement="left"
        >
          <span>
            <Fab
              color="primary"
              aria-label="generate ai suggestions"
              sx={{
                position: "fixed",
                bottom: 100,
                right: 20,
                zIndex: 1200,
              }}
              onClick={handleGenerateAISuggestions}
              disabled={!canGenerateSuggestions}
            >
              <AutoFixHigh />
            </Fab>
          </span>
        </Tooltip>

        {/* Floating Suggestions Panel */}
        <FloatingSuggestionsPanel
          onNavigateToSuggestion={handleNavigateToSuggestion}
          onContentUpdate={onUpdateCV}
          onSave={onSave}
        />

        {/* Error Snackbar */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setError(null)}
            severity="error"
            sx={{ width: "100%" }}
            action={
              <Tooltip title="Close">
                <Close
                  fontSize="inherit"
                  onClick={() => setError(null)}
                  sx={{ cursor: "pointer" }}
                />
              </Tooltip>
            }
          >
            {error}
          </Alert>
        </Snackbar>

        {/* Loading Overlay */}
        {isGenerating && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: "rgba(0, 0, 0, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1400,
            }}
          >
            <Alert severity="info" sx={{ maxWidth: 400 }}>
              Generating AI suggestions based on job description...
            </Alert>
          </Box>
        )}

        {/* CSS for section highlighting animation */}
        <style>{`
          .highlighted-section {
            background-color: rgba(25, 118, 210, 0.1) !important;
            border: 2px solid rgba(25, 118, 210, 0.3) !important;
            border-radius: 8px !important;
            transition: all 0.3s ease !important;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </Box>
    </InlineDiffProvider>
  );
};

export default PDFCVEditorWithAI;
