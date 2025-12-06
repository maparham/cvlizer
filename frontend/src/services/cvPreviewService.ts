/**
 * CV Preview Service
 *
 * This service handles PDF file preview generation by sending files to the backend
 * for server-side rendering. It provides a simple interface for generating base64
 * preview images from PDF files before upload.
 *
 * Key features:
 * - PDF-only preview generation
 * - Graceful error handling with null returns
 * - 5-second timeout for preview requests
 * - Base64 image URL generation for display
 */

import api from './api';

export interface PDFPreviewResponse {
  preview_image_base64: string;
}

/**
 * Generate a preview image from a PDF file
 *
 * @param file - The PDF file to preview
 * @returns Base64 data URL string or null if preview fails
 */
export const generatePDFPreview = async (
  file: File
): Promise<string | null> => {
  // Only process PDF files
  if (file.type !== 'application/pdf') {
    return null;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post<PDFPreviewResponse>(
      '/api/cvs/preview/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 5000, // 5 second timeout for preview generation
      }
    );

    // Convert base64 string to data URL for img src
    return `data:image/png;base64,${response.data.preview_image_base64}`;
  } catch (error) {
    console.warn('PDF preview generation failed:', error);
    // Graceful degradation - return null to show fallback UI
    return null;
  }
};
