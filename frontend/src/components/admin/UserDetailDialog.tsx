/**
 * User Detail Dialog Component
 * 
 * This component displays detailed user information including CVs and AI sections.
 * It provides a comprehensive view of user data for administrative purposes.
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
  Box,
  Grid,
  Card,
  CardContent
} from '@mui/material'
import { UserDetail } from '../../types/admin'
import { formatDate, formatDateTime } from '../../utils/dateFormat'

interface UserDetailDialogProps {
  open: boolean
  onClose: () => void
  userDetail: UserDetail | null
}

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  open,
  onClose,
  userDetail
}) => {
  // Early return if dialog is not open or userDetail is null
  if (!open || !userDetail) return null

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
        User Details - {userDetail.email}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* User Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Email: {userDetail.email}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Clerk ID: {userDetail.clerk_id || 'N/A'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Status:
                    </Typography>
                    <Chip 
                      label={userDetail.is_active ? 'Active' : 'Inactive'} 
                      color={userDetail.is_active ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Email Verified:
                    </Typography>
                    <Chip 
                      label={userDetail.email_verified ? 'Verified' : 'Unverified'} 
                      color={userDetail.email_verified ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Created: {formatDate(userDetail.created_at)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Last Login: {userDetail.last_login ? formatDateTime(userDetail.last_login) : 'Never'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Statistics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Statistics
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  CVs: {userDetail.cvs.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  AI Sections: {userDetail.ai_sections?.length || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* CVs */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              CVs ({userDetail.cvs.length})
            </Typography>
            {userDetail.cvs.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No CVs found
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
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userDetail.cvs.map((cv) => (
                      <TableRow key={cv.id}>
                        <TableCell>{cv.original_filename}</TableCell>
                        <TableCell>{formatFileSize(cv.file_size)}</TableCell>
                        <TableCell>{cv.file_type}</TableCell>
                        <TableCell>
                          <Chip 
                            label={cv.is_parsed ? 'Parsed' : 'Error'} 
                            color={cv.is_parsed ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(cv.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>

          {/* AI Sections */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              AI Sections ({userDetail.ai_sections?.length || 0})
            </Typography>
            {!userDetail.ai_sections || userDetail.ai_sections.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No AI sections found
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Content</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userDetail.ai_sections.map((section) => (
                      <TableRow key={section.id}>
                        <TableCell>
                          <Chip label={section.section_type} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {section.section_content || 'No content'}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(section.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default UserDetailDialog
