/**
 * Empty State Component
 *
 * This module displays a welcome banner when the user has no CVs,
 * providing call-to-action buttons to create their first CV.
 *
 * Key responsibilities:
 * - Display welcome message and large icon
 * - Provide three creation options (Template, Scratch, Upload)
 * - Show gradient background for visual appeal
 * - Handle loading states for creation processes
 *
 * Usage:
 * - Used in Dashboard component when cvs.length === 0
 * - Provides initial user onboarding experience
 * - Connects to CV creation handlers
 */

import React from "react";
import { Paper, Typography, Button, Stack } from "@mui/material";
import { Upload as UploadIcon, Article as TemplateIcon, Add as AddIcon, Description as DocumentIcon } from "@mui/icons-material";

interface EmptyStateProps {
  creating: boolean;
  onCreateFromTemplate: () => void;
  onStartFromScratch: () => void;
  onUpload: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  creating,
  onCreateFromTemplate,
  onStartFromScratch,
  onUpload,
}) => {
  return (
    <Paper
      sx={{
        p: 8,
        textAlign: "center",
        borderRadius: 4,
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 3,
      }}
    >
      <DocumentIcon
        sx={{
          fontSize: 96,
          color: "primary.main",
          mb: 4,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
        }}
      />
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: "text.primary",
          letterSpacing: "-0.025em",
          mb: 3,
        }}
      >
        Create or import your CV
      </Typography>
      <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap">
        <Button
          variant="outlined"
          size="large"
          startIcon={<TemplateIcon />}
          onClick={onCreateFromTemplate}
          disabled={creating}
          data-testid="create-cv-from-template-empty-state-button"
          sx={{
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 600,
            px: 5,
            py: 2,
            "&:hover": {
              backgroundColor: "action.hover",
            },
            "&:disabled": {
              backgroundColor: "action.disabled",
              color: "action.disabled",
            },
          }}
        >
          {creating ? "Creating..." : "Create CV from Template"}
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<AddIcon />}
          onClick={onStartFromScratch}
          disabled={creating}
          data-testid="start-from-scratch-empty-state-button"
          sx={{
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 600,
            px: 5,
            py: 2,
            "&:hover": {
              backgroundColor: "action.hover",
            },
            "&:disabled": {
              backgroundColor: "action.disabled",
              color: "action.disabled",
            },
          }}
        >
          {creating ? "Creating..." : "Start from Scratch"}
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<UploadIcon />}
          onClick={onUpload}
          data-testid="upload-cv-empty-state-button"
          sx={{
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 600,
            px: 5,
            py: 2,
            boxShadow: 3,
            "&:hover": {
              boxShadow: 6,
            },
          }}
        >
          Upload Existing CV
        </Button>
      </Stack>
    </Paper>
  );
};

export default EmptyState;
