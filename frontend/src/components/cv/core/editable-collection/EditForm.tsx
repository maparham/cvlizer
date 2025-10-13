/**
 * EditForm Component
 *
 * Renders the editing form for an item with save/cancel controls.
 */
import { Box, IconButton, Tooltip } from '@mui/material'
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material'
import type { EditFormProps } from './types'

function EditForm<T>({
  editData,
  editingItemIndex,
  title,
  isFormValid,
  onSave,
  onCancel,
  renderItemForm,
  updateItem
}: EditFormProps<T>) {
  return (
    <Box
      sx={{
        position: 'relative',
        mb: 0.25,
        p: 1,
        border: '1px solid #e0e0e0',
        borderRadius: 1
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: -8, right: -8, display: 'flex', gap: 0.5, zIndex: 1 }}>
          <Tooltip title="Save changes">
            <span>
              <IconButton
                onClick={onSave}
                disabled={!isFormValid}
                data-testid={`save-${title.toLowerCase().replace(/ /g, '-')}-button`}
                sx={{
                  bgcolor: 'white',
                  boxShadow: 1,
                  '&:disabled': {
                    opacity: 0.5
                  }
                }}
                size="small"
              >
                <SaveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Cancel editing">
            <IconButton
              onClick={onCancel}
              data-testid={`cancel-${title.toLowerCase().replace(/ /g, '-')}-button`}
              sx={{
                bgcolor: 'white',
                boxShadow: 1
              }}
              size="small"
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {renderItemForm(editData, editingItemIndex, updateItem, onSave)}
      </Box>
    </Box>
  )
}

export default EditForm
