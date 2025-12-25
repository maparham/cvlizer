import React, { useEffect, useRef } from "react";
import { Box, Typography, IconButton, Divider, Tooltip, Button } from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { BaseSectionProps } from "../../../types";
import { EditableTitle } from "../EditableTitle";

const BaseSection: React.FC<BaseSectionProps> = ({
  title,
  onEdit,
  onSave,
  onCancel,
  children,
  editButton,
  headerActions,
  headerActionsLeft,
  isEditing,
  isSaving = false,
  isValid = true,
  onTitleSave,
  sectionId,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Auto-focus first input when entering edit mode
  useEffect(() => {
    if (isEditing && sectionRef.current) {
      const firstInput = sectionRef.current.querySelector(
        "input, textarea",
      ) as HTMLInputElement;
      if (firstInput) {
        // Small delay to ensure the input is rendered
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [isEditing]);

  return (
    <Box
      ref={sectionRef}
      data-section={sectionId}
      sx={{
        position: "relative",
        transition: "background-color 1s ease, border 0.3s ease, border-radius 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease",
        ...(isSaving && {
          bgcolor: "rgba(76, 175, 80, 0.2)",
          transition: "background-color 0s",
        }),
        ...(isEditing && !isSaving && {
          border: "3px solid #1976d2",
          borderRadius: "8px",
          bgcolor: "rgba(25, 118, 210, 0.08)",
          boxShadow:
            "0 0 0 2px rgba(25, 118, 210, 0.2), 0 4px 12px rgba(25, 118, 210, 0.15)",
          p: 2,
        }),
      }}
    >
      {isEditing && (onSave || onCancel) ? (
        // Show save and cancel icon buttons in edit mode (each button only if corresponding handler is provided)
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            display: "flex",
            gap: 0.5,
          }}
        >
          {onSave && (
            <Tooltip title="Save changes">
              <span>
                <IconButton
                  onClick={onSave}
                  disabled={!isValid}
                  sx={{
                    opacity: 1,
                    transition: "opacity 0.2s",
                    bgcolor: "white",
                    boxShadow: 1,
                    "&:disabled": {
                      opacity: 0.5,
                    },
                  }}
                  size="small"
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onCancel && (
            <Tooltip title="Cancel editing">
              <span>
                <IconButton
                  onClick={onCancel}
                  sx={{
                    opacity: 1,
                    transition: "opacity 0.2s",
                    bgcolor: "white",
                    boxShadow: 1,
                  }}
                  size="small"
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      ) : // Show edit button or custom editButton in view mode
      editButton !== null ? (
        editButton
      ) : (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            display: "flex",
            gap: 0.5,
          }}
        >
          <Tooltip title="Edit this section">
            <span>
              <IconButton
                className="edit-button"
                onClick={onEdit}
                data-testid={
                  sectionId ? `edit-section-${sectionId}-button` : undefined
                }
                sx={{
                  opacity: 1,
                  color: "text.secondary",
                  bgcolor: "transparent",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    color: "primary.main",
                    bgcolor: "rgba(227, 242, 253, 0.5)",
                  },
                }}
                size="small"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {onTitleSave ? (
            <EditableTitle
              title={title || ""}
              onSave={onTitleSave}
              variant="h5"
              sx={{
                "& .MuiTypography-root": {
                  fontWeight: "bold",
                  color: "#1976d2",
                },
              }}
            />
          ) : (
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", color: "#1976d2" }}
            >
              {title}
            </Typography>
          )}
          {headerActionsLeft}
        </Box>
        {headerActions}
      </Box>

      {children}
      {isEditing && (onSave || onCancel) && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
            mt: 2,
            pt: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          {onCancel && (
            <Button
              variant="outlined"
              onClick={onCancel}
              data-testid={
                sectionId
                  ? `cancel-section-${sectionId}-button-bottom`
                  : undefined
              }
            >
              Cancel
            </Button>
          )}
          {onSave && (
            <Button
              variant="contained"
              onClick={onSave}
              disabled={!isValid}
              data-testid={
                sectionId
                  ? `save-section-${sectionId}-button-bottom`
                  : undefined
              }
              startIcon={<SaveIcon />}
            >
              Save
            </Button>
          )}
        </Box>
      )}
      <Divider sx={{ my: 2 }} />
    </Box>
  );
};

export default BaseSection;
