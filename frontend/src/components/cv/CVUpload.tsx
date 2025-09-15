import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper
} from '@mui/material'
import { Upload as UploadIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material'
import { cvApi } from '../../services/api'
import { useCVStore } from '../../stores/cvStore'

interface CVUploadProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CVUpload: React.FC<CVUploadProps> = ({ open, onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Use the CV store's upload function
  const { uploadCV: uploadCVToStore } = useCVStore()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    setError('')
    setSuccess(false)
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, or DOCX file')
      return
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Use the store's upload function which handles state updates
      await uploadCVToStore(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setSuccess(true)
      
      // Close immediately after upload, parsing happens in background
      setTimeout(() => {
        onSuccess() // This will refresh the CV list
        setUploading(false)
        setUploadProgress(0)
        setSuccess(false)
        onClose() // Close the dialog after success callback
      }, 1000) // Give a moment to show success message
      
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      onClose()
      setError('')
      setSuccess(false)
      setUploadProgress(0)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload CV</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
              CV uploaded successfully! AI is now parsing your CV in the background.
            </Alert>
          )}

          {uploading && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading CV...
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <Paper
            variant="outlined"
            sx={{
              p: 4,
              textAlign: 'center',
              border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
              backgroundColor: dragActive ? '#f5f5f5' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {dragActive ? 'Drop your CV here' : 'Drag & drop your CV here'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              or click to browse files
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: PDF, DOC, DOCX (max 10MB)
            </Typography>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {success ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CVUpload
