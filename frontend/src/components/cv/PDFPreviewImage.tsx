/**
 * PDF Preview Component
 *
 * This component displays an embedded PDF viewer using the browser's native
 * PDF rendering capabilities. It creates a blob URL from the File object
 * and displays it in an iframe, allowing users to view the full PDF with
 * navigation, zoom, and search capabilities.
 *
 * Key features:
 * - Instant preview (no server round-trip)
 * - Full PDF navigation (all pages, zoom, search)
 * - Graceful error handling with fallback UI
 * - Proper cleanup to prevent memory leaks
 * - Client-side only (no backend processing)
 *
 * Usage:
 * <PDFPreviewImage file={pdfFile} maxWidth={600} />
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { Description as DocumentIcon } from '@mui/icons-material';

interface PDFPreviewImageProps {
  file: File;
  maxWidth?: number;
}

export const PDFPreviewImage: React.FC<PDFPreviewImageProps> = ({
  file,
  maxWidth = 300,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      setHasError(true);
      return;
    }

    // Create object URL from file
    try {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setHasError(false);

      // Cleanup function to revoke object URL and prevent memory leaks
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Failed to create object URL for PDF:', error);
      setHasError(true);
    }
  }, [file]);

  // Error state: show fallback document icon
  if (hasError || !pdfUrl) {
    return (
      <Box
        sx={{
          width: '100%',
          maxWidth,
          p: 4,
          bgcolor: 'grey.50',
          borderRadius: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
        }}
        data-testid="pdf-preview-fallback"
      >
        <DocumentIcon sx={{ fontSize: 64, color: 'grey.400', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Preview unavailable
        </Typography>
      </Box>
    );
  }

  // Success state: show embedded PDF viewer
  return (
    <Box data-testid="pdf-preview-viewer">
      <Box
        component="iframe"
        src={pdfUrl}
        title="PDF Preview"
        sx={{
          width: '100%',
          maxWidth,
          height: '600px',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          display: 'block',
        }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, display: 'block' }}
      >
        PDF preview - scroll to view all pages
      </Typography>
    </Box>
  );
};

export default PDFPreviewImage;
