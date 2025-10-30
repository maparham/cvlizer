/**
 * CV Upload Component
 *
 * This module provides a drag-and-drop file upload interface for CV files including:
 * - Drag and drop functionality with visual feedback
 * - File type and size validation (PDF, DOC, DOCX up to 10MB)
 * - Visual file preview before upload
 * - Upload progress tracking with visual indicators
 * - Integration with CV store for state management
 * - Error handling and user feedback
 */
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper,
} from "@mui/material";
import {
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useCVStore } from "../../stores/cv";
import FilePreview from "./FilePreview";
import { validateCVFile } from "../../utils/fileValidation";

interface CVUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (cvId: string) => void;
}

const CVUpload: React.FC<CVUploadProps> = ({ open, onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Use the CV store's upload function
  const { uploadCV: uploadCVToStore } = useCVStore();

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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setError("");
    setSuccess(false);

    // Validate the file before setting it
    try {
      const validation = validateCVFile(file);
      if (!validation.isValid) {
        setError(validation.error || "Invalid file");
        return;
      }
      setSelectedFile(file);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "File validation failed";
      setError(errorMessage);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Simulate upload progress
      progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            if (progressInterval) {
              clearInterval(progressInterval);
            }
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Use the store's upload function which handles state updates
      const created = await uploadCVToStore(selectedFile);

      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setUploadProgress(100);
      setSuccess(true);

      // Close shortly after upload; parsing happens in background
      setTimeout(() => {
        onSuccess(created.id);
        setUploading(false);
        setUploadProgress(0);
        setSuccess(false);
        setSelectedFile(null);
        onClose(); // Close the dialog after success callback
      }, 1000); // Give a moment to show success message
    } catch (err: unknown) {
      // Clear interval on error to prevent timer leak
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      const errorMessage =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Upload failed. Please try again.";
      setError(errorMessage);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError("");
    setSuccess(false);
  };

  const handleClose = () => {
    if (!uploading) {
      onClose();
      setError("");
      setSuccess(false);
      setUploadProgress(0);
      setSelectedFile(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      data-testid="cv-upload-dialog"
    >
      <DialogTitle>Upload CV</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
              CV uploaded successfully! AI is now parsing your CV in the
              background.
            </Alert>
          )}

          {uploading && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading CV...
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          {selectedFile ? (
            <FilePreview
              file={selectedFile}
              onRemove={handleRemoveFile}
              onUpload={handleUpload}
              uploading={uploading}
              error={error}
            />
          ) : (
            <Paper
              variant="outlined"
              data-testid="cv-upload-dropzone"
              sx={{
                p: 4,
                textAlign: "center",
                border: dragActive ? "2px dashed #1976d2" : "2px dashed #ccc",
                backgroundColor: dragActive ? "#f5f5f5" : "transparent",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <UploadIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                {dragActive ? "Drop your CV here" : "Drag & drop your CV here"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                or click to browse files
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported formats: PDF, DOC, DOCX (max 10MB)
              </Typography>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileInput}
                style={{ display: "none" }}
                disabled={uploading}
                data-testid="cv-file-input"
              />
            </Paper>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={uploading}
          data-testid="cv-upload-dialog-close-button"
        >
          {success ? "Close" : "Cancel"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVUpload;
