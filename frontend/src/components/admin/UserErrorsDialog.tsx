/**
 * User Errors Dialog Component
 *
 * This component displays user error logs in a dialog format.
 * It provides a clean interface for viewing user error information
 * for debugging and support purposes.
 */
import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button
} from '@mui/material'

interface UserError {
  id: string
  error_message: string
  error_type: string
  page_url: string
  timestamp: string
}

interface UserErrorsDialogProps {
  open: boolean
  onClose: () => void
  errors: UserError[]
  formatDateTime: (_date: string) => string
}

const UserErrorsDialog: React.FC<UserErrorsDialogProps> = ({
  open,
  onClose,
  errors,
  formatDateTime
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        User Errors
        {errors.length > 0 && (
          <Typography variant="body2" color="textSecondary">
            {errors.length} error(s) found
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {errors.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
            No errors found for this user
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Page</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errors.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell>
                      <Chip label={error.error_type} size="small" color="error" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {error.error_message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {error.page_url || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(error.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default UserErrorsDialog
