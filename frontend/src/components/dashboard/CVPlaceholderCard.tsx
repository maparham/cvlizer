/**
 * CV Placeholder Card Component
 *
 * A card shown in the CV grid that acts as an upload target: click to open
 * the file selector, or drag and drop a file. Calls onFileSelected(file) so
 * the parent can open the Upload CV dialog with the file pre-selected.
 */
import React, { useState, useRef } from "react";
import { Card, CardContent, Typography, Grid } from "@mui/material";
import { Upload as UploadIcon } from "@mui/icons-material";
import { validateCVFile } from "../../utils/fileValidation";

interface CVPlaceholderCardProps {
  onFileSelected: (file: File) => void;
  onValidationError?: (error: string) => void;
}

const CVPlaceholderCard: React.FC<CVPlaceholderCardProps> = ({
  onFileSelected,
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
      if (validation.isValid) {
        onFileSelected(file);
      } else if (validation.error && onValidationError) {
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
      if (validation.isValid) {
        onFileSelected(file);
      } else if (validation.error && onValidationError) {
        onValidationError(validation.error);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Grid item xs={12} sm={6} lg={4}>
      <Card
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        data-testid="cv-placeholder-card"
        sx={{
          height: "100%",
          minHeight: 200,
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          border: "2px dashed",
          borderColor: dragActive ? "primary.main" : "divider",
          backgroundColor: dragActive ? "action.hover" : "background.paper",
          boxSizing: "border-box",
          cursor: "pointer",
          textAlign: "center",
          transition:
            "border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease",
          "&:hover": {
            borderColor: "primary.light",
            boxShadow: 2,
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", p: 3 }}>
          <UploadIcon
            sx={{ fontSize: 48, color: "text.secondary", mb: 1.5 }}
            aria-hidden
          />
          <Typography variant="h6" color="text.primary" gutterBottom>
            Upload CV
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click or drag & drop
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            PDF, DOCX (max 10MB)
          </Typography>
        </CardContent>
      </Card>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileInput}
        style={{ display: "none" }}
        data-testid="cv-placeholder-file-input"
      />
    </Grid>
  );
};

export default CVPlaceholderCard;
