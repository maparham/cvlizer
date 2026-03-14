/**
 * Reusable profile picture upload for CV personal info.
 *
 * Supports drag-and-drop or click, JPG/PNG up to 1 MB, circle or square preview.
 * All I/O via callbacks; no direct backend calls.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { AddPhotoAlternate as UploadIcon, Delete as DeleteIcon } from "@mui/icons-material";

const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const MAX_SIZE_BYTES = 1024 * 1024; // 1 MB

const PICTURE_SIZES = {
  small: 80,
  standard: 96,
  large: 128,
} as const;

function getFileError(file: File): string | null {
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "Only JPG and PNG images are allowed.";
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Use JPG or PNG.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File size must be 1 MB or less (current: ${(file.size / 1024).toFixed(0)} KB).`;
  }
  return null;
}

export interface ProfilePictureUploadProps {
  currentImageUrl: string | null;
  currentShape: "circle" | "square";
  currentSize: "small" | "standard" | "large";
  onUpload: (file: File, shape: "circle" | "square", size: "small" | "standard" | "large") => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onShapeChange: (shape: "circle" | "square") => void;
  onSizeChange: (size: "small" | "standard" | "large") => void;
  disabled?: boolean;
  uploading?: boolean;
  deleting?: boolean;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  currentShape,
  currentSize,
  onUpload,
  onDelete,
  onShapeChange,
  onSizeChange,
  disabled = false,
  uploading = false,
  deleting = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const err = getFileError(file);
      if (err) {
        setError(err);
        return;
      }
      void Promise.resolve(onUpload(file, currentShape, currentSize));
    },
    [currentShape, currentSize, onUpload]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || uploading || deleting) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [disabled, uploading, deleting, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClickUpload = useCallback(() => {
    if (disabled || uploading || deleting) return;
    inputRef.current?.click();
  }, [disabled, uploading, deleting]);

  const loading = uploading || deleting;
  const previewSize = PICTURE_SIZES[currentSize];

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Profile picture
      </Typography>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
        {/* Preview or drop zone */}
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!currentImageUrl ? handleClickUpload : undefined}
          sx={{
            width: previewSize,
            height: previewSize,
            flexShrink: 0,
            borderRadius: currentShape === "circle" ? "50%" : 1,
            overflow: "hidden",
            border: "2px dashed",
            borderColor: dragOver ? "primary.main" : "divider",
            bgcolor: dragOver ? "action.hover" : "action.selected",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: currentImageUrl ? "default" : disabled || loading ? "not-allowed" : "pointer",
          }}
        >
          {currentImageUrl ? (
            <Box
              component="img"
              src={currentImageUrl}
              alt="Profile"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <UploadIcon sx={{ fontSize: 36, color: "text.disabled" }} />
          )}
        </Box>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          style={{ display: "none" }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <RadioGroup
            row
            value={currentShape}
            onChange={(_, v) => onShapeChange(v as "circle" | "square")}
            name="profile-picture-shape"
          >
            <FormControlLabel
              value="circle"
              control={<Radio size="small" />}
              label="Circle"
              disabled={disabled}
            />
            <FormControlLabel
              value="square"
              control={<Radio size="small" />}
              label="Square"
              disabled={disabled}
            />
          </RadioGroup>
          <RadioGroup
            row
            value={currentSize}
            onChange={(_, v) => onSizeChange(v as "small" | "standard" | "large")}
            name="profile-picture-size"
            sx={{ mt: 0.5 }}
          >
            <FormControlLabel
              value="small"
              control={<Radio size="small" />}
              label="Small"
              disabled={disabled}
            />
            <FormControlLabel
              value="standard"
              control={<Radio size="small" />}
              label="Standard"
              disabled={disabled}
            />
            <FormControlLabel
              value="large"
              control={<Radio size="small" />}
              label="Large"
              disabled={disabled}
            />
          </RadioGroup>
          {currentImageUrl && (
            <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleClickUpload}
                disabled={disabled || loading}
              >
                {uploading ? "Uploading…" : "Replace"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => void Promise.resolve(onDelete())}
                disabled={disabled || loading}
              >
                {deleting ? "Removing…" : "Remove"}
              </Button>
            </Box>
          )}
          {!currentImageUrl && !loading && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              JPG or PNG, max 1 MB. Click or drag and drop.
            </Typography>
          )}
          {error && (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};
