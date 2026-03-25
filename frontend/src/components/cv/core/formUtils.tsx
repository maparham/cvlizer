/**
 * Form Utilities and Components
 *
 * This module provides reusable form components and utilities for CV sections.
 * It includes form fields, date pickers, and validation components with consistent styling.
 *
 * Key responsibilities:
 * - Provide reusable form field components (FormField, DateFieldComponent)
 * - Handle date picker integration with proper formatting
 * - Ensure consistent form styling across CV sections
 *
 * Note: Validation-aware components (ValidatedFormField, ValidatedDateField, ValidatedDisplay)
 * are provided in the validatedFields module, not here.
 *
 * Usage:
 * - Import FormField for standard text inputs
 * - Use DateFieldComponent for date inputs with validation
 * - Integrate with CV section components for consistent form behavior
 */
import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MarkdownEditor from "./MarkdownEditor";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateField as MUIDateField } from "@mui/x-date-pickers/DateField";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import {
  formatDateForBackend,
  parseDateForPicker,
} from "../../../utils/dateUtils";
import dayjs from "dayjs";
import { WritingCorrection } from "../../../types/ai";
import { InlineFieldCorrection } from "../ai/InlineFieldCorrection";

export interface FormFieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "url" | "email";
  minLength?: number;
  useMarkdownEditor?: boolean;
}

export interface DateFieldConfig {
  name: string;
  label: string;
  required?: boolean;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
}

/**
 * Common form field component with validation
 */
export const FormField: React.FC<{
  config: FormFieldConfig;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  sx?: any;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  // Writing correction props for markdown diff corrections
  htmlDiffCorrection?: { html_diff: string; correction: WritingCorrection } | null;
  onApplyCorrection?: (correction: WritingCorrection) => void;
  onDismissCorrection?: () => void;
}> = ({ config, value, onChange, onSave, sx, error: errorOverride, helperText: helperTextOverride, disabled, htmlDiffCorrection, onApplyCorrection, onDismissCorrection }) => {
  const {
    name,
    label,
    placeholder,
    required,
    multiline,
    rows,
    type,
    minLength,
    useMarkdownEditor,
  } = config;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      if (onSave && (!required || value?.trim())) {
        onSave();
      }
    } else if (event.key === "Escape") {
      // Let the global escape handler in usePDFCVEditor handle this
      // Don't call local onCancel to avoid conflicts
      return;
    }
  };

  const hasValue = value?.trim();
  const meetsMinLength =
    !minLength || (hasValue && hasValue.length >= minLength);

  // Use override error/helperText if provided, otherwise compute from validation rules
  const isError = errorOverride !== undefined
    ? errorOverride
    : Boolean((required && !hasValue) || (hasValue && !meetsMinLength));

  const helperText = helperTextOverride !== undefined
    ? helperTextOverride
    : (isError
        ? !hasValue
          ? `${label} is required`
          : !meetsMinLength
            ? `${label} must be at least ${minLength} characters long`
            : ""
        : "");

  const isSuccess = Boolean(required && hasValue && meetsMinLength && !errorOverride);

  // Use markdown editor if enabled and multiline is true
  if (useMarkdownEditor && multiline) {
    return (
      <Box>
        <Box sx={sx}>
          <MarkdownEditor
            value={value || ""}
            onChange={(newValue) => onChange(newValue || "")}
            placeholder={placeholder || `e.g., ${label.toLowerCase()}`}
            error={isError}
            helperText={helperText}
            rows={rows || 4}
            disabled={disabled}
          />
        </Box>
        {htmlDiffCorrection && (
          <InlineFieldCorrection
            htmlDiffCorrection={htmlDiffCorrection}
            importance={htmlDiffCorrection.correction.importance}
            reasoning={(() => {
              // Get reasoning from the description FieldCorrection
              const descFieldCorrection = htmlDiffCorrection.correction.field_corrections?.find(
                fc => fc.field_name === 'description'
              );
              return descFieldCorrection?.reasoning;
            })()}
            onApply={() => onApplyCorrection?.(htmlDiffCorrection.correction)}
            onDismiss={onDismissCorrection || (() => {})}
          />
        )}
      </Box>
    );
  }

  return (
    <Box>
      <TextField
        {...{
          name,
          label: required ? `${label} *` : label,
          placeholder: placeholder || `e.g., ${label.toLowerCase()}`,
          value: value || "",
          onChange: (e) => onChange(e.target.value),
          onKeyDown: handleKeyDown,
          error: isError,
          helperText: helperText,
          variant: "standard",
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
            ) : undefined,
          },
          sx: {
            ...sx,
          },
        }}
      />
      {htmlDiffCorrection && (
        <InlineFieldCorrection
          htmlDiffCorrection={htmlDiffCorrection}
          importance={htmlDiffCorrection.correction.importance}
          reasoning={(() => {
            // Get reasoning from the description FieldCorrection
            const descFieldCorrection = htmlDiffCorrection.correction.field_corrections?.find(
              fc => fc.field_name === 'description'
            );
            return descFieldCorrection?.reasoning;
          })()}
          onApply={() => onApplyCorrection?.(htmlDiffCorrection.correction)}
          onDismiss={onDismissCorrection || (() => {})}
        />
      )}
    </Box>
  );
};

/**
 * Common date field component (legacy DatePicker)
 */
export const DateField: React.FC<{
  config: DateFieldConfig;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  sx?: any;
}> = ({ config, value, onChange, onSave, sx }) => {
  const { label, required } = config;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (onSave && (!required || value?.trim())) {
        onSave();
      }
    } else if (event.key === "Escape") {
      // Let the global escape handler in usePDFCVEditor handle this
      // Don't call local onCancel to avoid conflicts
      return;
    }
  };

  return (
    <DatePicker
      label={required ? `${label} *` : label}
      value={parseDateForPicker(value)}
      onChange={(date) => onChange(date ? formatDateForBackend(date) : "")}
      slotProps={{
        textField: {
          fullWidth: true,
          variant: "standard",
          error: required && !value?.trim(),
          helperText: required && !value?.trim() ? `${label} is required` : "",
          onKeyDown: handleKeyDown,
          sx: {
            ...sx,
          },
        },
      }}
    />
  );
};

/**
 * Common date field component using DateField with better typing behavior and date picker
 */
export const DateFieldComponent: React.FC<{
  config: DateFieldConfig;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  sx?: any;
  error?: boolean;
  helperText?: string;
}> = ({ config, value, onChange, onSave, sx, error: errorOverride, helperText: helperTextOverride }) => {
  const { label, required, minDate, maxDate } = config;
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string>("");
  const [inputValue, setInputValue] = React.useState<string>("");
  const anchorRef = React.useRef<HTMLButtonElement>(null);

  // Real-time validation function
  const validateDateValue = React.useCallback(
    (dateValue: string): string => {
      // Check for empty or whitespace-only strings
      if (!dateValue || !dateValue.trim()) {
        return required ? `${label} is required` : "";
      }

      // Reject "Present" string - date fields should only contain valid ISO dates or be empty
      const trimmedValue = dateValue.trim();
      if (trimmedValue.toLowerCase() === 'present') {
        return `${label} must be a valid date. Use empty value for current positions/ongoing activities.`;
      }

      // Check if date is valid
      const parsedDate = dayjs(dateValue);
      const isValid = parsedDate.isValid();

      if (!isValid) {
        return `${label} is not a valid date`;
      }

      // Check min/max constraints
      if (minDate) {
        const minParsed = dayjs(minDate);
        if (parsedDate.isBefore(minParsed)) {
          return `${label} must be after ${minDate}`;
        }
      }

      if (maxDate) {
        const maxParsed = dayjs(maxDate);
        if (parsedDate.isAfter(maxParsed)) {
          return `${label} must be before ${maxDate}`;
        }
      }

      return "";
    },
    [label, required, minDate, maxDate],
  );

  // Validate on value change (only if no override provided)
  React.useEffect(() => {
    if (helperTextOverride === undefined) {
      const error = validateDateValue(value);
      setValidationError(error);
    } else {
      setValidationError(helperTextOverride || "");
    }
  }, [value, validateDateValue, helperTextOverride]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (onSave && (!required || value?.trim())) {
        onSave();
      }
    } else if (event.key === "Escape") {
      // Let the global escape handler in usePDFCVEditor handle this
      // Don't call local onCancel to avoid conflicts
      return;
    }
  };

  // Initialize inputValue from prop value
  React.useEffect(() => {
    if (value && dayjs(value).isValid()) {
      setInputValue(dayjs(value).format("DD.MM.YYYY"));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleDateChange = (date: any) => {
    if (!date) {
      setInputValue("");
      onChange("");
      return;
    }

    // Always update the display value
    if (dayjs.isDayjs(date)) {
      const displayValue = date.format("DD.MM.YYYY");
      setInputValue(displayValue);

      // Only update backend if valid
      if (date.isValid()) {
        const newValue = date.format("YYYY-MM-DD");
        onChange(newValue);
      }
    } else if (date instanceof Date && !isNaN(date.getTime())) {
      const dayjsDate = dayjs(date);
      const displayValue = dayjsDate.format("DD.MM.YYYY");
      const newValue = dayjsDate.format("YYYY-MM-DD");
      setInputValue(displayValue);
      onChange(newValue);
    }
  };

  const handlePickerDateChange = (date: any) => {
    if (date && dayjs.isDayjs(date)) {
      const displayValue = date.format("DD.MM.YYYY");
      const backendValue = date.format("YYYY-MM-DD");
      setInputValue(displayValue);
      onChange(backendValue);
    } else if (date && date instanceof Date) {
      const dayjsDate = dayjs(date);
      const displayValue = dayjsDate.format("DD.MM.YYYY");
      const backendValue = dayjsDate.format("YYYY-MM-DD");
      setInputValue(displayValue);
      onChange(backendValue);
    } else if (!date) {
      setInputValue("");
      onChange("");
    }
    setPickerOpen(false);
  };

  // Use override error if provided, otherwise use computed validation error
  const hasError = errorOverride !== undefined
    ? errorOverride
    : !!validationError;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ position: "relative", minHeight: "48px" }}>
        <MUIDateField
          label={required ? `${label} *` : label}
          value={inputValue ? dayjs(inputValue, "DD.MM.YYYY") : null}
          onChange={handleDateChange}
          format="DD.MM.YYYY"
          slotProps={{
            textField: {
              fullWidth: true,
              variant: "standard",
              error: hasError,
              helperText: (helperTextOverride !== undefined ? helperTextOverride : validationError) || " ", // Always reserve space for helper text
              onKeyDown: handleKeyDown,
              sx: {
                ...sx,
                pr: 4, // Add padding right to make space for the icon
              },
            },
          }}
        />
        <IconButton
          ref={anchorRef}
          onClick={() => setPickerOpen(true)}
          size="small"
          sx={{
            position: "absolute",
            right: 0,
            bottom: 22, // Fixed position since we always have helper text space
            p: 0.5,
            color: "primary.main",
            "&:hover": {
              backgroundColor: "primary.light",
              color: "primary.dark",
            },
          }}
          tabIndex={-1}
        >
          <CalendarIcon fontSize="small" />
        </IconButton>
        {pickerOpen && (
          <DatePicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            value={inputValue ? dayjs(inputValue, "DD.MM.YYYY") : null}
            onChange={handlePickerDateChange}
            minDate={minDate ? dayjs(minDate) : undefined}
            maxDate={maxDate ? dayjs(maxDate) : undefined}
            slotProps={{
              textField: {
                sx: { display: "none" }, // Hide the DatePicker's text field since we're using TextField
              },
              popper: {
                placement: "bottom-start",
                anchorEl: anchorRef.current,
              },
            }}
          />
        )}
      </Box>
    </LocalizationProvider>
  );
};

/**
 * Common save/cancel button group
 */
export const SaveCancelButtons: React.FC<{
  onSave: () => void;
  onCancel: () => void;
  isValid: boolean;
  saveText?: string;
  cancelText?: string;
}> = ({
  onSave,
  onCancel,
  isValid,
  saveText = "Save",
  cancelText = "Cancel",
}) => {
  // Note: Escape key handling is managed globally by usePDFCVEditor

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
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
  );
};

/**
 * Common array item container with edit/delete buttons
 */
export const ArrayItemContainer: React.FC<{
  index: number;
  title: string;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ index, title, onEdit, onDelete, children, className }) => (
  <Box
    sx={{
      border: "1px solid #e0e0e0",
      borderRadius: 1,
      p: 2,
      mb: 2,
      position: "relative",
      "&:hover .item-action-button": {
        opacity: 1,
      },
    }}
    className={className}
  >
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 2,
      }}
    >
      <Typography variant="h6">
        {title} {index + 1}
      </Typography>
      <Box>
        <IconButton
          className="item-edit-button"
          onClick={() => onEdit(index)}
          sx={{
            opacity: 1,
            transition: "opacity 0.2s",
            bgcolor: "white",
            boxShadow: 1,
            mr: 1,
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
            transition: "all 0.2s ease",
            bgcolor: "transparent",
            color: "text.secondary",
            "&:hover": {
              color: "error.main",
              bgcolor: "rgba(255, 235, 238, 0.5)",
              opacity: 1,
            },
          }}
          size="small"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
    {children}
  </Box>
);

/**
 * Common empty state component
 */
export const EmptyState: React.FC<{
  message: string;
}> = ({ message }) => (
  <Typography variant="body2" color="text.secondary">
    {message}
  </Typography>
);

/**
 * Common form validation utilities
 */
export const createFormValidator = (requiredFields: string[]) => {
  return (data: Record<string, any>): boolean => {
    // Safety check: if requiredFields is undefined or not an array, return true
    if (!requiredFields || !Array.isArray(requiredFields)) {
      return true;
    }
    return requiredFields.every((field) => {
      const value = data[field];
      return value !== null && value !== undefined && value.toString().trim();
    });
  };
};

/**
 * Common array item validation
 */
export const createArrayItemValidator = (requiredFields: string[]) => {
  return (item: Record<string, any>): boolean => {
    // Safety check: if requiredFields is undefined or not an array, return true
    if (!requiredFields || !Array.isArray(requiredFields)) {
      return true;
    }
    return requiredFields.every((field) => {
      const value = item[field];
      return value !== null && value !== undefined && value.toString().trim();
    });
  };
};
