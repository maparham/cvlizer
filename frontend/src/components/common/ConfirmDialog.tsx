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
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import Warning from "@mui/icons-material/Warning";

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
  warning?: string;
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
  warning,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Alert severity={severity} sx={{ mb: warning ? 1 : 2 }}>
          {message}
        </Alert>
        {warning && (
          <Box
            sx={{
              mt: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "warning.main",
            }}
          >
            <Warning sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {warning}
            </Typography>
          </Box>
        )}
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
