import React, { useEffect, useRef } from "react";
import { Box, Typography, IconButton, Divider, Tooltip } from "@mui/material";
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
  isEditing,
  isValid = true,
  onTitleSave,
  sectionId,
  enhancementButton,
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
      sx={{
        position: "relative",
      }}
    >
      {isEditing && onCancel ? (
        // Show save and cancel icon buttons in edit mode (save button only if onSave is provided)
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
          <Tooltip title="Cancel editing">
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
          </Tooltip>
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
          {enhancementButton}
          <Tooltip title="Edit this section">
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
        {headerActions}
      </Box>

      {children}
      <Divider sx={{ my: 2 }} />
    </Box>
  );
};

export default BaseSection;
