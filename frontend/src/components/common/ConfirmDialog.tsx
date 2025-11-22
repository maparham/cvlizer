/**
 * ConfirmDialog Component
 *
 * A reusable confirmation dialog for actions requiring user confirmation.
 * Provides a simple yes/no confirmation with customizable messages and button text.
 *
 * Key responsibilities:
 * - Display confirmation prompts for actions
 * - Handle user confirmation or cancellation
 * - Customizable title, message, and button styling
 *
 * Usage context:
 * - Used throughout the application for confirmations
 * - Suitable for deletion confirmations, unsaved changes warnings, etc.
 * - Provides consistent confirmation UI across the app
 */

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from "@mui/material";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  confirmButtonColor?:
    | "error"
    | "primary"
    | "secondary"
    | "success"
    | "info"
    | "warning";
  severity?: "error" | "warning" | "info" | "success";
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = "Confirm",
  confirmButtonColor = "primary",
  severity = "warning",
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Alert severity={severity} sx={{ mb: 2 }}>
          {message}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={confirmButtonColor}
        >
          {confirmButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
