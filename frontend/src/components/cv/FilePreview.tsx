/**
 * File Preview Component
 *
 * This module provides a visual file preview card that displays file information
 * before upload, including filename, file size, file type icon, and validation status.
 * It allows users to review their selection and remove it before proceeding with upload.
 *
 * Key responsibilities:
 * - Display file metadata in a user-friendly format
 * - Show file type icons and formatted file sizes
 * - Provide remove functionality to clear selection
 * - Validate files before showing preview
 * - Integrate with existing upload flow
 *
 * Usage:
 * - Used in CVUpload component to show file preview
 * - Provides non-blocking, cancellable file selection
 * - Maintains compatibility with existing upload validation
 */
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  IconButton,
  Grid,
} from "@mui/material";
import {
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import {
  validateCVFile,
  getFileTypeInfo,
  formatFileSize,
} from "../../utils/fileValidation";
import PDFPreviewImage from "./PDFPreviewImage";

export interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  onUpload: () => void;
  uploading?: boolean;
  error?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  onUpload,
  uploading = false,
  error,
}) => {
  // Get file type icon
  const getFileTypeIcon = (fileType: string) => {
    const fileInfo = getFileTypeInfo(fileType);
    if (fileInfo.icon === "pdf") {
      return <PdfIcon sx={{ color: fileInfo.color }} />;
    } else if (fileInfo.icon === "doc" || fileInfo.icon === "docx") {
      return <DocIcon sx={{ color: fileInfo.color }} />;
    }
    return <DocumentIcon sx={{ color: fileInfo.color }} />;
  };

  // Validate file and get info
  const validation = validateCVFile(file);
  const valid = validation.isValid;
  const fileSize = formatFileSize(file.size);
  const fileTypeInfo = getFileTypeInfo(file.type);

  return (
    <Card
      sx={{
        width: "100%",
        mx: "auto",
        border: error
          ? "1px solid #d32f2f"
          : valid
            ? "1px solid #2e7d32"
            : "1px solid #ccc",
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {file.type === "application/pdf" ? (
          // PDF files: Two-column layout with preview
          <Grid container spacing={2}>
            {/* Left: PDF Preview */}
            <Grid item xs={12} md={7}>
              <PDFPreviewImage file={file} maxWidth={600} />
            </Grid>

            {/* Right: Metadata */}
            <Grid item xs={12} md={5}>
              <Box>
                {/* File icon, name, type */}
                <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                  <Box sx={{ mr: 2, mt: 0.5 }}>{getFileTypeIcon(file.type)}</Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        wordBreak: "break-word",
                      }}
                    >
                      {file.name}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Chip
                        label={fileTypeInfo.name}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.75rem" }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {fileSize}
                      </Typography>
                    </Stack>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={onRemove}
                    disabled={uploading}
                    sx={{ ml: 1 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Validation Status */}
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  {error ? (
                    <>
                      <ErrorIcon sx={{ color: "#d32f2f", mr: 1, fontSize: "1.2rem" }} />
                      <Typography variant="body2" color="error">
                        {error}
                      </Typography>
                    </>
                  ) : valid ? (
                    <>
                      <CheckIcon sx={{ color: "#2e7d32", mr: 1, fontSize: "1.2rem" }} />
                      <Typography variant="body2" color="success.main">
                        File is valid and ready to upload
                      </Typography>
                    </>
                  ) : (
                    <>
                      <ErrorIcon sx={{ color: "#d32f2f", mr: 1, fontSize: "1.2rem" }} />
                      <Typography variant="body2" color="error">
                        {validation.error || "Invalid file type or size"}
                      </Typography>
                    </>
                  )}
                </Box>

                {/* File Details */}
                <Box sx={{ backgroundColor: "#f5f5f5", p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    File Details:
                  </Typography>
                  <Stack spacing={0.5}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        Type:
                      </Typography>
                      <Typography variant="body2">{fileTypeInfo.name}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        Size:
                      </Typography>
                      <Typography variant="body2">{fileSize}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        Last Modified:
                      </Typography>
                      <Typography variant="body2">
                        {new Date(file.lastModified).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Grid>
          </Grid>
        ) : (
          // Non-PDF files: Original single-column layout
          <Box>
            {/* File icon, name, type */}
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
              <Box sx={{ mr: 2, mt: 0.5 }}>{getFileTypeIcon(file.type)}</Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    mb: 0.5,
                    wordBreak: "break-word",
                  }}
                >
                  {file.name}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Chip
                    label={fileTypeInfo.name}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.75rem" }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {fileSize}
                  </Typography>
                </Stack>
              </Box>
              <IconButton
                size="small"
                onClick={onRemove}
                disabled={uploading}
                sx={{ ml: 1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Validation Status */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              {error ? (
                <>
                  <ErrorIcon sx={{ color: "#d32f2f", mr: 1, fontSize: "1.2rem" }} />
                  <Typography variant="body2" color="error">
                    {error}
                  </Typography>
                </>
              ) : valid ? (
                <>
                  <CheckIcon sx={{ color: "#2e7d32", mr: 1, fontSize: "1.2rem" }} />
                  <Typography variant="body2" color="success.main">
                    File is valid and ready to upload
                  </Typography>
                </>
              ) : (
                <>
                  <ErrorIcon sx={{ color: "#d32f2f", mr: 1, fontSize: "1.2rem" }} />
                  <Typography variant="body2" color="error">
                    {validation.error || "Invalid file type or size"}
                  </Typography>
                </>
              )}
            </Box>

            {/* File Details */}
            <Box sx={{ backgroundColor: "#f5f5f5", p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                File Details:
              </Typography>
              <Stack spacing={0.5}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Type:
                  </Typography>
                  <Typography variant="body2">{fileTypeInfo.name}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Size:
                  </Typography>
                  <Typography variant="body2">{fileSize}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Modified:
                  </Typography>
                  <Typography variant="body2">
                    {new Date(file.lastModified).toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </CardContent>

    </Card>
  );
};

export default FilePreview;
