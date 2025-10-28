/**
 * CV Editor Header Component
 *
 * Displays the header bar with:
 * - Back navigation button with unsaved changes detection
 * - Export and Delete action buttons
 * - User menu with Profile/Admin/Logout options
 * - Unsaved changes confirmation dialog
 */
import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  FileDownload as FileDownloadIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useCVEditor } from "../../contexts/CVEditorContext";
import { CVEditorHeaderProps } from "./types";

export const CVEditorHeader: React.FC<CVEditorHeaderProps> = ({
  onLogout,
  onMenuOpen,
  onMenuClose,
  anchorEl,
  onExport,
  onDelete,
  isAdmin,
  isNewCV,
}) => {
  const navigate = useNavigate();
  const { editingSection, editingIndividualItem, hasUnsavedChanges } =
    useCVEditor();
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  const handleBackClick = () => {
    // Check if any section is in edit mode or has unsaved changes
    if (editingSection || editingIndividualItem || hasUnsavedChanges) {
      setShowBackDialog(true);
    } else {
      navigate("/dashboard");
    }
  };

  const handleBackDialogClose = () => {
    setShowBackDialog(false);
  };

  const handleBackDialogConfirm = () => {
    setShowBackDialog(false);
    navigate("/dashboard");
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleQuickExport = () => {
    handleExportMenuClose();
    onExport();
  };

  const handleAdvancedExport = () => {
    handleExportMenuClose();
    // Navigate to export page with current cvId from location
    const cvId = window.location.pathname.split("/cv/")[1];
    if (cvId) {
      navigate(`/cv/${cvId}/export`);
    }
  };

  return (
    <>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "background.paper",
          boxShadow: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          color: "text.primary",
        }}
      >
        <Toolbar sx={{ minHeight: "64px !important", px: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              edge="start"
              onClick={handleBackClick}
              data-testid="cv-editor-back-button"
              sx={{
                mr: 2,
                color: "text.secondary",
                "&:hover": {
                  backgroundColor: "action.hover",
                  color: "text.primary",
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Dashboard
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />

          {!isNewCV && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={onDelete}
              sx={{
                mr: 2,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                borderColor: "error.main",
                color: "error.main",
                "&:hover": {
                  backgroundColor: "error.light",
                  color: "error.contrastText",
                  borderColor: "error.dark",
                },
              }}
            >
              Delete
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            endIcon={<ExpandMoreIcon />}
            onClick={handleExportMenuOpen}
            sx={{
              mr: 2,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "primary.light"
              },
            }}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
          >
            <MenuItem onClick={handleQuickExport}>
              <FileDownloadIcon sx={{ mr: 1, fontSize: "1.2rem" }} />
              Quick Export
            </MenuItem>
            <MenuItem onClick={handleAdvancedExport}>
              <PictureAsPdfIcon sx={{ mr: 1, fontSize: "1.2rem" }} />
              Advanced Export
            </MenuItem>
          </Menu>
          <IconButton
            size="medium"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={onMenuOpen}
            data-testid="cv-editor-user-menu-button"
            sx={{
              color: "text.secondary",
              "&:hover": {
                backgroundColor: "action.hover",
                color: "text.primary",
              },
            }}
          >
            <AccountCircleIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={onMenuClose}
          >
            <MenuItem
              onClick={() => {
                navigate("/profile");
                onMenuClose();
              }}
            >
              Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                onExport();
                onMenuClose();
              }}
            >
              Export as PDF
            </MenuItem>
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  navigate("/admin");
                  onMenuClose();
                }}
              >
                Admin
              </MenuItem>
            )}
            <MenuItem onClick={onLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Back navigation confirmation dialog */}
      <Dialog
        open={showBackDialog}
        onClose={handleBackDialogClose}
        aria-labelledby="back-dialog-title"
        aria-describedby="back-dialog-description"
        data-testid="unsaved-changes-dialog"
      >
        <DialogTitle id="back-dialog-title">Unsaved Changes</DialogTitle>
        <DialogContent>
          <DialogContentText id="back-dialog-description">
            You have unsaved changes that will be lost if you go back. Are you
            sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleBackDialogClose}
            data-testid="unsaved-changes-stay-button"
          >
            Stay
          </Button>
          <Button
            onClick={handleBackDialogConfirm}
            color="error"
            autoFocus
            data-testid="unsaved-changes-leave-button"
          >
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
