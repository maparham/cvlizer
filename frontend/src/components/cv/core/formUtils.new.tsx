import React from 'react'
import { Box, TextField, Button, Typography, IconButton, InputAdornment } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { DateField as MUIDateField } from '@mui/x-date-pickers/DateField'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon, CheckCircle as CheckIcon, Warning as WarningIcon } from '@mui/icons-material'
import { formatDateForBackend, parseDateForPicker } from '../../../utils/dateUtils'
import dayjs from 'dayjs'

/**
 * Common form components and utilities for CV sections
 */

export interface FormFieldConfig {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  multiline?: boolean
  rows?: number
  type?: 'text' | 'url' | 'email'
}

export interface DateFieldConfig {
  name: string
  label: string
  required?: boolean
}

/**
 * Common form field component with validation
 */
export const FormField: React.FC<{
  config: FormFieldConfig
  value: string
  onChange: (value: string) => void
  onSave?: () => void
  sx?: any
}> = ({ config, value, onChange, onSave, sx }) => {
  const { name, label, placeholder, required, multiline, rows, type } = config
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault()
      if (onSave && (!required || value?.trim())) {
        onSave()
      }
    } else if (event.key === 'Escape') {
      // Let the global escape handler in usePDFCVEditor handle this
      // Don't call local onCancel to avoid conflicts
      return
    }
  }
  
  const hasValue = value?.trim()
  const isError = required && !hasValue
  const isSuccess = required && hasValue
  
  return (
    <TextField
      {...{
        name,
        label: required ? `${label} *` : label,
        placeholder: placeholder || `e.g., ${label.toLowerCase()}`,
        value: value || '',
        onChange: (e) => onChange(e.target.value),
        onKeyDown: handleKeyDown,
        error: isError,
        helperText: isError ? `${label} is required` : '',
        variant: 'standard',
        fullWidth: true,
        multiline,
        rows,
        type,
        InputProps: {
          endAdornment: isSuccess ? (
            <InputAdornment position="end">
              <CheckIcon color="success" fontSize="small" />
            </InputAdornment>
          ) : isError ? (
            <InputAdornment position="end">
              <WarningIcon color="error" fontSize="small" />
            </InputAdornment>
          ) : undefined
        },
        sx: {
          ...sx
        }
      }}
    />
  )
}

/**
 * Common date field component (legacy DatePicker)
 */
export const DateField: React.FC<{
  config: DateFieldConfig
  value: string
  onChange: (value: string) => void
  onSave?: () => void
  sx?: any
}> = ({ config, value, onChange, onSave, sx }) => {
  const { label, required } = config
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (onSave && (!required || value?.trim())) {
        onSave()
      }
    } else if (event.key === 'Escape') {
      // Let the global escape handler in usePDFCVEditor handle this
      // Don't call local onCancel to avoid conflicts
      return
    }
  }
  
  return (
    <DatePicker
      label={required ? `${label} *` : label}
      value={parseDateForPicker(value)}
      onChange={(date) => onChange(date ? formatDateForBackend(date) : '')}
      slotProps={{
        textField: {
          fullWidth: true,
          variant: 'standard',
          error: required && !value?.trim(),
          helperText: required && !value?.trim() ? `${label} is required` : '',
          onKeyDown: handleKeyDown,
          sx: {
            ...sx
          }
        }
      }}
    />
  )
}

/**
 * Common date field component using DateField with better typing behavior
 */
export const DateFieldComponent: React.FC<{
  config: DateFieldConfig
  value: string
  onChange: (value: string) => void
  onSave?: () => void
  sx?: any
}> = ({ config, value, onChange, onSave, sx }) => {
  const { label, required } = config
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (onSave && (!required || value?.trim())) {
        onSave()
      }
    } else if (event.key === 'Escape') {
      // Let the global escape handler in usePDFCVEditor handle this
      // Don't call local onCancel to avoid conflicts
      return
    }
  }
  
  // Convert string value to dayjs object, handling various date formats
  const dayjsValue = value ? dayjs(value) : null
  
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MUIDateField
        label={required ? `${label} *` : label}
        value={dayjsValue}
        onChange={(date) => onChange(date ? (date as any).format('YYYY-MM-DD') : '')}
        format="MM-DD-YYYY"
        slotProps={{
          textField: {
            fullWidth: true,
            variant: 'standard',
            error: required && !value?.trim(),
            helperText: required && !value?.trim() ? `${label} is required` : '',
            onKeyDown: handleKeyDown,
            sx: {
              ...sx
            }
          }
        }}
      />
    </LocalizationProvider>
  )
}

/**
 * Common save/cancel button group
 */
export const SaveCancelButtons: React.FC<{
  onSave: () => void
  onCancel: () => void
  isValid: boolean
  saveText?: string
  cancelText?: string
}> = ({ onSave, onCancel, isValid, saveText = 'Save', cancelText = 'Cancel' }) => {
  // Note: Escape key handling is managed globally by usePDFCVEditor

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button 
        size="small" 
        startIcon={<SaveIcon />} 
        onClick={onSave}
        disabled={!isValid}
      >
        {saveText}
      </Button>
      <Button size="small" startIcon={<CancelIcon />} onClick={onCancel}>
        {cancelText}
      </Button>
    </Box>
  )
}

/**
 * Common array item container with edit/delete buttons
 */
export const ArrayItemContainer: React.FC<{
  index: number
  title: string
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  children: React.ReactNode
  className?: string
}> = ({ index, title, onEdit, onDelete, children, className }) => (
  <Box 
    sx={{ 
      border: '1px solid #e0e0e0', 
      borderRadius: 1, 
      p: 2, 
      mb: 2,
      position: 'relative',
      '&:hover .item-action-button': {
        opacity: 1
      }
    }}
    className={className}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6">{title} {index + 1}</Typography>
      <Box>
        <IconButton
          className="item-edit-button"
          onClick={() => onEdit(index)}
          sx={{
            opacity: 1,
            transition: 'opacity 0.2s',
            bgcolor: 'white',
            boxShadow: 1,
            mr: 1
          }}
          size="small"
        >
          <SaveIcon fontSize="small" />
        </IconButton>
        <IconButton
          className="item-action-button"
          onClick={() => onDelete(index)}
          sx={{
            opacity: 0.3,
            transition: 'all 0.2s ease',
            bgcolor: 'transparent',
            color: 'text.secondary',
            '&:hover': {
              color: 'error.main',
              bgcolor: 'rgba(255, 235, 238, 0.5)',
              opacity: 1
            }
          }}
          size="small"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
    {children}
  </Box>
)

/**
 * Common empty state component
 */
export const EmptyState: React.FC<{
  message: string
}> = ({ message }) => (
  <Typography variant="body2" color="text.secondary">
    {message}
  </Typography>
)

/**
 * Common form validation utilities
 */
export const createFormValidator = (requiredFields: string[]) => {
  return (data: Record<string, any>): boolean => {
    return requiredFields.every(field => data[field]?.toString().trim())
  }
}

/**
 * Common array item validation
 */
export const createArrayItemValidator = (requiredFields: string[]) => {
  return (item: Record<string, any>): boolean => {
    return requiredFields.every(field => item[field]?.toString().trim())
  }
}
