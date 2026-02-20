/**
 * Empty State Component
 *
 * This module displays a welcome banner when the user has no CVs,
 * providing call-to-action buttons to create their first CV.
 *
 * Key responsibilities:
 * - Display welcome message and large icon
 * - Provide two creation options (Template, Scratch) as small buttons at top
 * - Large drag-and-drop upload area that's also clickable
 * - Show gradient background for visual appeal
 * - Handle loading states for creation processes
 *
 * Usage:
 * - Used in Dashboard component when cvs.length === 0
 * - Provides initial user onboarding experience
 * - Connects to CV creation handlers
 */

import React, { useState, useRef } from "react";
import { Paper, Typography, Button, Stack, Box } from "@mui/material";
import { CloudUpload as UploadIcon, Article as TemplateIcon, Add as AddIcon } from "@mui/icons-material";
import { validateCVFile } from "../../utils/fileValidation";

interface EmptyStateProps {
  creating: boolean;
  onCreateFromTemplate: () => void;
  onStartFromScratch: () => void;
  onFileDrop?: (file: File) => void | Promise<void>;
  onValidationError?: (error: string) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  creating,
  onCreateFromTemplate,
  onStartFromScratch,
  onFileDrop,
  onValidationError,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validation = validateCVFile(file);
      if (validation.isValid && onFileDrop) {
        onFileDrop(file);
      } else if (!validation.isValid && validation.error && onValidationError) {
        onValidationError(validation.error);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateCVFile(file);
      if (validation.isValid && onFileDrop) {
        onFileDrop(file);
      } else if (!validation.isValid && validation.error && onValidationError) {
        onValidationError(validation.error);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Box>
      {/* Buttons at the top */}
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<TemplateIcon />}
          onClick={onCreateFromTemplate}
          disabled={creating}
          data-testid="create-cv-from-template-empty-state-button"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            py: 1.25,
            boxShadow: 2,
            "&:hover": {
              boxShadow: 4,
            },
          }}
        >
          {creating ? "Creating..." : "Create CV from Template"}
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onStartFromScratch}
          disabled={creating}
          data-testid="start-from-scratch-empty-state-button"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            py: 1.25,
            boxShadow: 2,
            "&:hover": {
              boxShadow: 4,
            },
          }}
        >
          {creating ? "Creating..." : "Create Empty"}
        </Button>
      </Stack>

      {/* Drag-and-drop upload area */}
      <Paper
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        sx={{
          p: 6,
          textAlign: "center",
          borderRadius: 4,
          background: dragActive
            ? "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)"
            : "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)",
          border: "2px dashed",
          borderColor: dragActive ? "primary.main" : "grey.400",
          boxShadow: dragActive ? 4 : 0,
          transition: "all 0.2s ease-in-out",
          cursor: "pointer",
          "&:hover": {
            borderColor: "primary.light",
            background: "linear-gradient(135deg, #f5f9ff 0%, #e8f4fd 100%)",
          },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileInput}
          style={{ display: "none" }}
          data-testid="cv-file-input"
        />

        <UploadIcon
          sx={{
            fontSize: 72,
            color: dragActive ? "primary.main" : "grey.500",
            mb: 2,
            transition: "all 0.2s ease-in-out",
          }}
        />

        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: dragActive ? "primary.main" : "text.primary",
            mb: 1,
            transition: "all 0.2s ease-in-out",
          }}
        >
          {dragActive ? "Drop your CV here" : "Drag & drop your CV here"}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            mb: 2,
          }}
        >
          or click to browse files
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: "text.disabled",
            display: "block",
          }}
        >
          Supported formats: PDF, DOCX (max 10MB)
        </Typography>
      </Paper>
    </Box>
  );
};

export default EmptyState;
