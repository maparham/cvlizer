/**
 * User CVs Dialog Component
 *
 * This component displays user CVs in a dialog format.
 * It provides a clean interface for viewing user CV information
 * for administrative purposes.
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
  Button,
  Box
} from '@mui/material'
import { UserCV } from '../../types/admin'
import { formatDate } from '../../utils/dateFormat'

interface UserCVsDialogProps {
  open: boolean
  onClose: () => void
  userCVs: UserCV[]
}

const UserCVsDialog: React.FC<UserCVsDialogProps> = ({
  open,
  onClose,
  userCVs
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        User CVs
        {userCVs.length > 0 && (
          <Typography variant="body2" color="textSecondary">
            {userCVs.length} CV(s) found
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {userCVs.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
            No CVs found for this user
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>AI Sections</TableCell>
                  <TableCell>Job Descriptions</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userCVs.map((cv) => (
                  <TableRow key={cv.id}>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {cv.original_filename}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatFileSize(cv.file_size)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {cv.file_type}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Chip
                          label={cv.is_parsed ? 'Parsed' : 'Error'}
                          color={cv.is_parsed ? 'success' : 'error'}
                          size="small"
                        />
                        <Chip
                          label={cv.parsing_status}
                          color="info"
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {cv.ai_sections_count}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {cv.job_descriptions_count}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(cv.created_at)}
                      </Typography>
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

export default UserCVsDialog
