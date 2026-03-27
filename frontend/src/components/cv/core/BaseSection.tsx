import React, { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import HideIcon from "@mui/icons-material/VisibilityOff";
import DeleteIcon from "@mui/icons-material/Delete";
import { BaseSectionProps } from "../../../types";
import { EditableTitle } from "../EditableTitle";
import ConfirmDialog from "../../common/ConfirmDialog";

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
  showDivider = true,
  onHide,
  onDelete,
  isCustomSection = false,
  readOnly = false,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isPersonalInfo = sectionId === "personal_info";

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
      {!readOnly && isEditing && (onSave || onCancel) ? (
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
      ) : readOnly ? null : editButton !== null ? (
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
          // Reserve space for absolute edit button when default edit + hide/delete are shown so they don't overlap
          ...(editButton === null &&
            onHide !== undefined &&
            onDelete !== undefined && { paddingRight: 5 }),
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
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          {!readOnly &&
            onHide !== undefined &&
            onDelete !== undefined &&
            !isEditing && (
            <>
              <Tooltip
                title={
                  isPersonalInfo
                    ? "Personal information cannot be hidden"
                    : "Hide section"
                }
              >
                <span>
                  <IconButton
                    onClick={isPersonalInfo ? undefined : onHide}
                    disabled={isPersonalInfo}
                    size="small"
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        bgcolor: isPersonalInfo ? "transparent" : "action.hover",
                      },
                    }}
                    data-testid={
                      sectionId ? `hide-section-${sectionId}-button` : undefined
                    }
                  >
                    <HideIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              {isCustomSection && (
                <Tooltip
                  title={isPersonalInfo ? "Cannot delete" : "Delete section"}
                >
                  <span>
                    <IconButton
                      onClick={
                        isPersonalInfo
                          ? undefined
                          : () => setDeleteDialogOpen(true)
                      }
                      disabled={isPersonalInfo}
                      size="small"
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          bgcolor: isPersonalInfo
                            ? "transparent"
                            : "error.light",
                          color: isPersonalInfo ? undefined : "error.main",
                        },
                      }}
                      data-testid={
                        sectionId
                          ? `delete-section-${sectionId}-button`
                          : undefined
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </>
          )}
          {headerActions}
        </Box>
      </Box>
      {!readOnly && isCustomSection && onDelete && !isPersonalInfo && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={() => {
            onDelete();
            setDeleteDialogOpen(false);
          }}
          title="Delete section?"
          message="This will permanently remove this section and its content. This cannot be undone."
          confirmButtonText="Delete"
          confirmButtonColor="error"
          severity="error"
        />
      )}

      {children}
      {!readOnly && isEditing && (onSave || onCancel) && (
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
      {showDivider && <Divider sx={{ my: 2 }} />}
    </Box>
  );
};

export default BaseSection;
