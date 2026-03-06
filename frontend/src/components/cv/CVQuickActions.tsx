/**
 * CV Quick Actions Component
 *
 * This module provides a context menu and 3-dot menu for CV cards with quick actions
 * including Duplicate, Rename, Delete, and Export PDF. It supports both
 * right-click context menus and 3-dot button menus for better accessibility.
 *
 * Key responsibilities:
 * - Provide right-click context menu on CV cards
 * - Add 3-dot menu button as alternative access method
 * - Handle all CV actions with loading states
 * - Confirm destructive actions (Delete)
 * - Show loading states for time-consuming operations
 * - Integrate with existing CV management functions
 *
 * Usage:
 * - Used in Dashboard CV cards for quick actions
 * - Provides consistent action interface across all CVs
 * - Maintains compatibility with existing CV operations
 */
import React, { useState } from "react";
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  ContentCopy as DuplicateIcon,
  Edit as RenameIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { CV } from "../../types";
import { commonStyles } from "../../styles/commonStyles";
import MenuItems, { MenuItemData } from "../common/MenuItems";
import { useDialogState, useMenuState } from "../../hooks/useDialogState";

export interface CVQuickActionsProps {
  cv: CV;
  onDuplicate: (_cv: CV) => void;
  onRename: (_cv: CV, _newName: string) => void;
  onDownload: (_cv: CV) => void;
  duplicating?: boolean;
  downloading?: boolean;
}

const CVQuickActions: React.FC<CVQuickActionsProps> = ({
  cv,
  onDuplicate,
  onRename,
  onDownload,
  duplicating = false,
  downloading = false,
}) => {
  const { anchorEl, openMenu, closeMenu, isOpen } = useMenuState();
  const {
    anchorEl: contextMenuAnchor,
    openMenu: openContextMenu,
    closeMenu: closeContextMenu,
    isOpen: contextMenuOpen,
  } = useMenuState();
  const {
    open: renameDialogOpen,
    openDialog: openRenameDialog,
    closeDialog: closeRenameDialog,
  } = useDialogState();
  const [newName, setNewName] = useState(cv.original_filename);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    openMenu(event);
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    openContextMenu(event);
  };

  const handleMenuClose = () => {
    closeMenu();
    closeContextMenu();
  };

  const handleDuplicate = () => {
    onDuplicate(cv);
    handleMenuClose();
  };

  const handleRename = () => {
    openRenameDialog();
    handleMenuClose();
  };

  const handleDownload = () => {
    onDownload(cv);
    handleMenuClose();
  };

  const handleRenameConfirm = () => {
    if (newName.trim() && newName !== cv.original_filename) {
      onRename(cv, newName.trim());
    }
    closeRenameDialog();
    setNewName(cv.original_filename);
  };

  const handleRenameCancel = () => {
    closeRenameDialog();
    setNewName(cv.original_filename);
  };

  const isError = Boolean(cv.parse_error);

  const menuItems: MenuItemData[] = [
    {
      label: "Duplicate",
      icon: <DuplicateIcon />,
      onClick: handleDuplicate,
      disabled: isError || duplicating || !cv.is_parsed,
      loading: duplicating,
      testId: `duplicate-cv-button-${cv.id}`,
    },
    {
      label: "Rename",
      icon: <RenameIcon />,
      onClick: handleRename,
      disabled: isError,
      testId: `rename-cv-button-${cv.id}`,
    },
    {
      label: "Export PDF",
      icon: <DownloadIcon />,
      onClick: handleDownload,
      disabled: isError || downloading,
      loading: downloading,
      testId: `download-cv-button-${cv.id}`,
    },
  ];

  return (
    <>
      {/* 3-dot menu button */}
      <IconButton
        size="small"
        onClick={handleMenuClick}
        onContextMenu={handleContextMenu}
        sx={commonStyles.iconButton.subtle}
        disabled={isError}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      {/* Context menu (right-click) */}
      <MenuItems
        items={menuItems}
        anchorEl={contextMenuAnchor}
        open={contextMenuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      />

      {/* 3-dot menu */}
      <MenuItems
        items={menuItems}
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleMenuClose}
      />

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={handleRenameCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: commonStyles.dialog,
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ fontWeight: 600, fontSize: "1.25rem" }}>Rename CV</Box>
            <IconButton onClick={handleRenameCancel} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter a new name for your CV:
          </DialogContentText>
          <Box
            component="input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameConfirm();
              }
            }}
            sx={{
              width: "100%",
              p: 2,
              border: "1px solid #ccc",
              ...commonStyles.input.standard,
            }}
            placeholder="Enter CV name..."
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={commonStyles.dialogActions}>
          <Button
            onClick={handleRenameCancel}
            sx={commonStyles.button.secondary}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameConfirm}
            variant="contained"
            disabled={!newName.trim() || newName === cv.original_filename}
            sx={commonStyles.button.primary}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CVQuickActions;
