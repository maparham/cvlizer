/**
 * Section Manager Dialogs
 *
 * Confirmation dialogs for AI suggestions: discard all and discard-drafts-then-regenerate.
 * Extracted from SectionManagerSidebar to reduce its size.
 */

import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export interface SectionManagerDialogsProps {
  discardAllDialogOpen: boolean;
  onCloseDiscardAll: () => void;
  onConfirmDiscardAll: () => void;
  draftConfirmationDialogOpen: boolean;
  onCloseDraftConfirmation: () => void;
  onConfirmDiscardAndRegenerate: () => void;
  totalSuggestionsCount: number;
}

export const SectionManagerDialogs: React.FC<SectionManagerDialogsProps> = ({
  discardAllDialogOpen,
  onCloseDiscardAll,
  onConfirmDiscardAll,
  draftConfirmationDialogOpen,
  onCloseDraftConfirmation,
  onConfirmDiscardAndRegenerate,
  totalSuggestionsCount,
}) => (
  <>
    <Dialog open={discardAllDialogOpen} onClose={onCloseDiscardAll}>
      <DialogTitle>Discard All Suggestions?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Discard all {totalSuggestionsCount} AI suggestion{totalSuggestionsCount !== 1 ? 's' : ''}? This
          cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseDiscardAll} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirmDiscardAll} color="error" variant="contained">
          Discard All
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={draftConfirmationDialogOpen}
      onClose={onCloseDraftConfirmation}
      aria-labelledby="draft-confirmation-dialog-title"
      aria-describedby="draft-confirmation-dialog-description"
    >
      <DialogTitle id="draft-confirmation-dialog-title">
        Discard Draft Suggestions?
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="draft-confirmation-dialog-description">
          Discard existing drafts and generate new ones?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseDraftConfirmation} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirmDiscardAndRegenerate} color="primary" variant="contained">
          Discard & Regenerate
        </Button>
      </DialogActions>
    </Dialog>
  </>
);
