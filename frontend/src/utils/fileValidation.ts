/**
 * File Validation Utilities
 *
 * This module provides centralized file validation logic for CV file uploads,
 * eliminating duplication between upload components and ensuring consistent
 * validation rules across the application.
 *
 * Key responsibilities:
 * - Validate CV file types (PDF, DOC, DOCX)
 * - Check file size limits (10MB max)
 * - Provide consistent error messages
 * - Support file metadata extraction
 *
 * Usage:
 * - Import validateCVFile() for file validation
 * - Use getFileTypeInfo() for file metadata
 * - Integrate with upload components for consistent validation
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FileTypeInfo {
  name: string;
  icon: "pdf" | "doc" | "docx" | "unknown";
  color: string;
}

// Constants
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FILE_TYPE_INFO: Record<string, FileTypeInfo> = {
  "application/pdf": { name: "PDF", icon: "pdf", color: "#d32f2f" },
  "application/msword": { name: "DOC", icon: "doc", color: "#1976d2" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    name: "DOCX",
    icon: "docx",
    color: "#1976d2",
  },
};

/**
 * Validate CV file for upload
 */
export const validateCVFile = (file: File): FileValidationResult => {
  if (!ALLOWED_TYPES.includes(file.type as any)) {
    return {
      isValid: false,
      error: "Invalid file type. Only PDF, DOC, and DOCX files are allowed.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: "File size must be less than 10MB.",
    };
  }

  return { isValid: true };
};

/**
 * Get file type information for display
 */
export const getFileTypeInfo = (fileType: string): FileTypeInfo => {
  return (
    FILE_TYPE_INFO[fileType] || { name: "FILE", icon: "unknown", color: "#666" }
  );
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Check if file type is allowed
 */
export const isAllowedFileType = (fileType: string): boolean => {
  return ALLOWED_TYPES.includes(fileType as any);
};

/**
 * Get maximum file size in bytes
 */
export const getMaxFileSize = (): number => {
  return MAX_FILE_SIZE;
};

/**
 * Get allowed file types for display
 */
export const getAllowedFileTypes = (): string[] => {
  return [...ALLOWED_TYPES];
};
