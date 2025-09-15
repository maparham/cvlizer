import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material'
import { RestartAlt as ResetIcon } from '@mui/icons-material'
import { UnsavedChangesDialog } from './'

interface PDFCVEditorDialogsProps {
  showResetDialog: boolean
  showUnsavedChangesDialog: boolean
  pendingChanges: Map<string, any>
  onCloseResetDialog: () => void
  onConfirmReset: () => void
  onCloseUnsavedChangesDialog: () => void
  onConfirmUnsavedChanges: () => void
}

const PDFCVEditorDialogs: React.FC<PDFCVEditorDialogsProps> = ({
  showResetDialog,
  showUnsavedChangesDialog,
  pendingChanges,
  onCloseResetDialog,
  onConfirmReset,
  onCloseUnsavedChangesDialog,
  onConfirmUnsavedChanges
}) => {
  return (
    <>
      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onClose={onCloseResetDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Section Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reset the section order to the default arrangement? 
            This will restore the sections based on the data found in your CV.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseResetDialog}>Cancel</Button>
          <Button 
            onClick={onConfirmReset} 
            variant="contained" 
            color="primary"
            startIcon={<ResetIcon />}
          >
            Reset Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onClose={onCloseUnsavedChangesDialog}
        onConfirm={onConfirmUnsavedChanges}
        pendingChanges={pendingChanges}
      />
    </>
  )
}

export default PDFCVEditorDialogs
