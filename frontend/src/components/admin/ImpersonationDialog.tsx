/**
 * ImpersonationDialog - Dialog for confirming user impersonation
 *
 * This component provides a confirmation dialog for starting user impersonation.
 * Shows warnings, justification input, and confirmation actions.
 *
 * Key responsibilities:
 * - Display impersonation warnings and information
 * - Collect justification for impersonation
 * - Handle confirmation and cancellation
 * - Show loading states during action
 *
 * Usage context:
 * - Used in admin dashboard for user management
 * - Integrates with impersonation service
 * - Provides security warnings and audit trail
 */

import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SwitchAccount from "@mui/icons-material/SwitchAccount";
import { UserSummary } from "../../types/admin";

interface ImpersonationDialogProps {
  open: boolean;
  onClose: () => void;
  target: UserSummary | null;
  justification: string;
  onJustificationChange: (justification: string) => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

const ImpersonationDialog: React.FC<ImpersonationDialogProps> = ({
  open,
  onClose,
  target,
  justification,
  onJustificationChange,
  onConfirm,
  loading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm User Impersonation</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning">
            You are about to impersonate user <strong>{target?.email}</strong>.
            This action will be logged for audit purposes. The session will
            automatically expire in 30 minutes.
          </Alert>
        </Box>

        <TextField
          fullWidth
          label="Justification (optional)"
          placeholder="Reason for impersonation..."
          value={justification}
          onChange={(e) => onJustificationChange(e.target.value)}
          multiline
          rows={3}
          variant="outlined"
          sx={{ mt: 2 }}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          During impersonation:
        </Typography>
        <Box component="ul" sx={{ mt: 1, pl: 2 }}>
          <Typography component="li" variant="body2" color="text.secondary">
            You will see the application as this user
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            A banner will indicate you are impersonating
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Admin functions will be disabled
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            All actions will be attributed to the target user
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="warning"
          disabled={!target || loading}
          startIcon={
            loading ? <CircularProgress size={16} /> : <SwitchAccount />
          }
        >
          {loading ? "Starting..." : "Start Impersonation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImpersonationDialog;
