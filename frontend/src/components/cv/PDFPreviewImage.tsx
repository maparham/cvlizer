/**
 * PDF Preview Image Component
 *
 * This component displays a preview image of a PDF file's first page.
 * It handles the loading state, success state with the preview image,
 * and error state with a fallback document icon.
 *
 * Key features:
 * - Async preview generation with loading skeleton
 * - Graceful error handling with fallback UI
 * - A4 aspect ratio (1:1.414) for realistic preview
 * - Cleanup on unmount to prevent memory leaks
 *
 * Usage:
 * <PDFPreviewImage file={pdfFile} maxWidth={300} />
 */

import React, { useState, useEffect } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import { Description as DocumentIcon } from '@mui/icons-material';
import { generatePDFPreview } from '../../services/cvPreviewService';

interface PDFPreviewImageProps {
  file: File;
  maxWidth?: number;
}

export const PDFPreviewImage: React.FC<PDFPreviewImageProps> = ({
  file,
  maxWidth = 300,
}) => {
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error';
    imageUrl: string | null;
  }>({ status: 'loading', imageUrl: null });

  useEffect(() => {
    let isMounted = true;

    const loadPreview = async () => {
      setState({ status: 'loading', imageUrl: null });

      const imageUrl = await generatePDFPreview(file);

      if (isMounted) {
        setState({
          status: imageUrl ? 'success' : 'error',
          imageUrl,
        });
      }
    };

    loadPreview();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [file]);

  // Loading state: show skeleton with A4 aspect ratio
  if (state.status === 'loading') {
    return (
      <Box>
        <Skeleton
          variant="rectangular"
          width={maxWidth}
          height={maxWidth * 1.414} // A4 aspect ratio (1:√2)
          sx={{ borderRadius: 1 }}
          data-testid="pdf-preview-skeleton"
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Generating preview...
        </Typography>
      </Box>
    );
  }

  // Error state: show fallback document icon
  if (state.status === 'error' || !state.imageUrl) {
    return (
      <Box
        sx={{
          width: maxWidth,
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

  // Success state: show preview image
  return (
    <Box data-testid="pdf-preview-image">
      <Box
        component="img"
        src={state.imageUrl}
        alt="PDF Preview"
        sx={{
          width: '100%',
          maxWidth,
          height: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, display: 'block' }}
      >
        First page preview
      </Typography>
    </Box>
  );
};

export default PDFPreviewImage;
