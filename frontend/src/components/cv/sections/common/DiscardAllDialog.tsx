/**
 * Discard All Dialog Component
 *
 * Reusable dialog component for discarding all suggestions in a section.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface DiscardAllDialogProps {
  visibleCount: number;
  isEditing: boolean;
  onDiscardAll: () => Promise<void>;
}

/**
 * Discard all suggestions dialog component
 * @param visibleCount - Number of visible suggestions
 * @param isEditing - Whether section is in editing mode
 * @param onDiscardAll - Callback to discard all suggestions
 */
export const DiscardAllDialog: React.FC<DiscardAllDialogProps> = ({
  visibleCount,
  isEditing,
  onDiscardAll,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleDiscard = async () => {
    await onDiscardAll();
    setDialogOpen(false);
  };

  if (visibleCount === 0 || isEditing) {
    return null;
  }

  return (
    <>
      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleOpenDialog}
          sx={{
            textTransform: "none",
            borderColor: "#f44336",
            color: "#f44336",
            "&:hover": {
              borderColor: "#d32f2f",
              backgroundColor: "#ffebee",
            },
          }}
        >
          Discard All Suggestions ({visibleCount})
        </Button>
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Discard All Suggestions?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Discard all {visibleCount} AI suggestions for this section?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDiscard} color="error" variant="contained">
            Discard All
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
