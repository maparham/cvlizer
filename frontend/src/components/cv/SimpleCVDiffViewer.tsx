/**
 * Simplified CV Diff Viewer Component
 * 
 * This component displays diff results computed by the backend service.
 * No frontend diff computation - just clean display of backend results.
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Remove as RemoveIcon,
  SwapHoriz as SwapHorizIcon
} from '@mui/icons-material'

import { CVHistoryEntry } from '../../types'
import { backendHistoryService, DiffChange, TextDiffData } from '../../services/backendHistoryService'

interface SimpleCVDiffViewerProps {
  oldVersion: CVHistoryEntry | null // null means let backend decide comparison
  newVersion: CVHistoryEntry | null // null means no version selected
  cvId: string
  title?: string
  forcePrevious?: boolean // force comparison to previous version even if original exists
}

const SimpleCVDiffViewer: React.FC<SimpleCVDiffViewerProps> = ({
  oldVersion,
  newVersion,
  cvId,
  title = "Changes",
  forcePrevious = false
}) => {
  const [changes, setChanges] = useState<DiffChange[]>([])
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDiff = async () => {
      // Safety check - don't fetch if newVersion is null
      if (!newVersion?.id) {
        setLoading(false)
        setError('No version selected')
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Get diff from backend
        const diffResult = await backendHistoryService.getDiff(
          cvId,
          newVersion.id,
          oldVersion?.id, // undefined means backend will use smart fallback logic
          forcePrevious // force comparison to previous version
        )
        
        setChanges(diffResult.changes)
        setSummary(diffResult.summary)
      } catch (err) {
        setError('Failed to load changes')
      } finally {
        setLoading(false)
      }
    }

    fetchDiff()
  }, [oldVersion?.id, newVersion?.id, cvId, forcePrevious])

  const getChangeIcon = (iconType: string) => {
    switch (iconType) {
      case 'add':
        return <AddIcon color="success" />
      case 'remove':
        return <RemoveIcon color="error" />
      case 'edit':
        return <EditIcon color="warning" />
      case 'swap':
        return <SwapHorizIcon color="info" />
      default:
        return <EditIcon color="warning" />
    }
  }

  const getChangeColor = (colorType: string) => {
    switch (colorType) {
      case 'success':
        return '#4caf50'
      case 'error':
        return '#f44336'
      case 'warning':
        return '#ff9800'
      case 'info':
        return '#2196f3'
      default:
        return '#ff9800'
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Computing changes...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    )
  }

  if (changes.length === 0) {
    return (
      <Alert severity="info">
        No changes detected between these versions.
      </Alert>
    )
  }

  return (
    <Box>
      {/* Summary */}
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      <Typography 
        variant="subtitle1" 
        color="text.secondary" 
        gutterBottom
        sx={{ fontWeight: 'medium' }}
      >
        {summary}
      </Typography>

      {/* Changes List */}
      <List sx={{ mt: 2 }}>
        {changes.map((change, index) => (
          <ListItem key={index} sx={{ px: 0, py: 1 }}>
            <Card 
              variant="outlined" 
              sx={{ 
                width: '100%',
                borderLeft: `4px solid ${getChangeColor(change.color)}`
              }}
            >
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" alignItems="flex-start" gap={1}>
                  {getChangeIcon(change.icon)}
                  
                  <Box flexGrow={1}>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {change.description}
                    </Typography>
                    
                    {/* Text Diff Display */}
                    {change.text_diff && (
                      <Box sx={{ mt: 2 }}>
                        {/* Statistics */}
                        <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.secondary' }}>
                          {change.text_diff.stats.additions > 0 && change.text_diff.stats.deletions > 0 
                            ? `${change.text_diff.stats.additions} characters added, ${change.text_diff.stats.deletions} removed`
                            : change.text_diff.stats.additions > 0 
                              ? `${change.text_diff.stats.additions} characters added`
                              : `${change.text_diff.stats.deletions} characters removed`
                          }
                        </Typography>
                        
                        {/* Inline Diff with Highlighting */}
                        {change.text_diff.inline_diff ? (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>
                              Text with changes highlighted:
                            </Typography>
                            <Box 
                              sx={{ 
                                p: 2,
                                bgcolor: '#f9f9f9',
                                border: '1px solid #e0e0e0',
                                borderRadius: 1,
                                fontSize: '0.875rem',
                                lineHeight: 1.6,
                                maxHeight: '300px',
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}
                              dangerouslySetInnerHTML={{ __html: change.text_diff.inline_diff }}
                            />
                          </Box>
                        ) : (
                          /* Fallback to side-by-side for large texts */
                          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                                Before:
                              </Typography>
                              <Box 
                                sx={{ 
                                  p: 1.5, bgcolor: '#ffebee', border: '1px solid #ffcdd2',
                                  borderRadius: 1, fontSize: '0.875rem', lineHeight: 1.4,
                                  maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap'
                                }}
                              >
                                {change.text_diff.old_text || '(empty)'}
                              </Box>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                After:
                              </Typography>
                              <Box 
                                sx={{ 
                                  p: 1.5, bgcolor: '#e8f5e8', border: '1px solid #c8e6c9',
                                  borderRadius: 1, fontSize: '0.875rem', lineHeight: 1.4,
                                  maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap'
                                }}
                              >
                                {change.text_diff.new_text || '(empty)'}
                              </Box>
                            </Box>
                          </Box>
                        )}
                        
                        {/* Word-level Summary */}
                        {change.text_diff.word_diff && change.text_diff.word_diff.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>
                              Summary of changes:
                            </Typography>
                            {change.text_diff.word_diff.map((wordChange, idx) => (
                              <Typography 
                                key={idx}
                                variant="body2" 
                                sx={{ 
                                  ml: 1, 
                                  color: 'text.secondary',
                                  fontFamily: 'monospace',
                                  fontSize: '0.8rem'
                                }}
                              >
                                • {wordChange}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                    
                    {/* Regular Details */}
                    {change.details && change.details.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {change.details.map((detail, detailIndex) => (
                          <Typography 
                            key={detailIndex}
                            variant="body2" 
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            • {detail}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </ListItem>
        ))}
      </List>
    </Box>
  )
}

export default SimpleCVDiffViewer
