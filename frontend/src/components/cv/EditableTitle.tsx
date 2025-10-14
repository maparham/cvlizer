import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  Typography,
  TextField,
  Box,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// Constants for title editor sizing
const TITLE_EDITOR_MIN_WIDTH = 200;
const TITLE_EDITOR_MAX_WIDTH = 450;
const TITLE_EDITOR_PADDING = 40;

interface EditableTitleProps {
  title: string;
  onSave: (newTitle: string) => Promise<void>;
  variant?: "h6" | "h5" | "h4";
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  maxWidth?: number;
  sx?: object;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({
  title,
  onSave,
  variant = "h6",
  disabled = false,
  maxLength = 100,
  placeholder = "Enter title",
  maxWidth = TITLE_EDITOR_MAX_WIDTH,
  sx = {},
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const [inputWidth, setInputWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  // Measure text width to set input width dynamically
  useLayoutEffect(() => {
    if (measureRef.current && isEditing) {
      const textToMeasure = editValue || placeholder;
      measureRef.current.textContent = textToMeasure;
      const width = measureRef.current.offsetWidth;
      // Add some padding and minimum width, with some extra space for comfortable editing
      // Maximum width to prevent pushing action icons out of view
      setInputWidth(
        Math.min(
          Math.max(width + TITLE_EDITOR_PADDING, TITLE_EDITOR_MIN_WIDTH),
          maxWidth,
        ),
      );
    }
  }, [editValue, placeholder, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Use setTimeout to ensure the input is fully rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          try {
            inputRef.current.select();
          } catch {
            // Fallback if select() doesn't work - silently ignore
          }
        }
      }, 10);
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(title);
    // Initialize width based on current title
    setTimeout(() => {
      if (measureRef.current) {
        measureRef.current.textContent = title || placeholder;
        const width = measureRef.current.offsetWidth;
        setInputWidth(
          Math.min(
            Math.max(width + TITLE_EDITOR_PADDING, TITLE_EDITOR_MIN_WIDTH),
            maxWidth,
          ),
        );
      }
    }, 0);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(title);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    // Validation
    if (!trimmedValue) {
      handleCancel();
      return;
    }

    if (trimmedValue === title) {
      setIsEditing(false);
      return;
    }

    if (trimmedValue.length > maxLength) {
      setEditValue(trimmedValue.substring(0, maxLength));
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (error) {
      // Error handling is done by the parent component
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSave();
    } else if (event.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <>
        {/* Hidden element to measure text width */}
        <Box
          component="span"
          ref={measureRef}
          sx={{
            position: "absolute",
            visibility: "hidden",
            whiteSpace: "pre",
            fontSize:
              variant === "h6"
                ? "1.25rem"
                : variant === "h5"
                  ? "1.5rem"
                  : "2rem",
            fontWeight: 500,
            fontFamily: "Roboto, sans-serif",
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ...sx }}>
          <TextField
            inputRef={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={handleSave}
            variant="standard"
            size="small"
            inputProps={{ maxLength }}
            placeholder={placeholder}
            disabled={isSaving}
            sx={{
              width: inputWidth || "auto",
              minWidth: TITLE_EDITOR_MIN_WIDTH,
              maxWidth: maxWidth,
              "& .MuiInput-input": {
                fontSize:
                  variant === "h6"
                    ? "1.25rem"
                    : variant === "h5"
                      ? "1.5rem"
                      : "2rem",
                fontWeight: 500,
              },
            }}
          />
          {isSaving && <CircularProgress size={16} />}
          {!isSaving && (
            <>
              <IconButton size="small" onClick={handleSave} color="primary">
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleCancel} color="default">
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </>
    );
  }

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        cursor: disabled ? "default" : "pointer",
        "&:hover .edit-icon": {
          opacity: disabled ? 0 : 1,
        },
        ...sx,
      }}
      onClick={handleStartEdit}
    >
      <Typography
        variant={variant}
        component="h2"
        sx={{
          wordBreak: "break-word",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {title}
      </Typography>
      {!disabled && (
        <EditIcon
          className="edit-icon"
          fontSize="small"
          sx={{
            opacity: 0,
            transition: "opacity 0.2s",
            color: "text.secondary",
          }}
        />
      )}
    </Box>
  );
};
