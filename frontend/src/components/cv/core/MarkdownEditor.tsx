/**
 * Markdown Editor Component
 *
 * This component provides a reusable markdown editor with Material-UI styling
 * and validation support. It wraps @uiw/react-md-editor to provide a split-view
 * editor with live preview and formatting toolbar.
 *
 * Key responsibilities:
 * - Provide markdown editing with live preview
 * - Integrate with Material-UI theme and validation system
 * - Support error states and helper text
 * - Match Material-UI TextField styling for consistency
 *
 * Usage:
 * - Used in FormField component when useMarkdownEditor is enabled
 * - Supports all standard form field props (value, onChange, error, helperText)
 * - Height is configurable via rows prop (converted to min height)
 */

import React from "react";
import MDEditor from "@uiw/react-md-editor";
import { Box, FormHelperText, useTheme } from "@mui/material";
import "@uiw/react-md-editor/markdown-editor.css";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  rows?: number;
  disabled?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder,
  error = false,
  helperText,
  rows = 4,
  disabled = false,
}) => {
  const theme = useTheme();

  // Calculate height based on rows (similar to TextField)
  // Approximate: each row is ~24px + padding
  const minHeight = rows * 24 + 32;

  return (
    <Box>
      <Box
        sx={{
          border: `1px solid ${
            error ? theme.palette.error.main : theme.palette.divider
          }`,
          borderRadius: 1,
          overflow: "hidden",
          "&:hover": {
            borderColor: error
              ? theme.palette.error.dark
              : theme.palette.action.hover,
          },
          "&:focus-within": {
            borderColor: error
              ? theme.palette.error.main
              : theme.palette.primary.main,
            borderWidth: 2,
          },
          "& .w-md-editor": {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            fontFamily: theme.typography.fontFamily,
          },
          "& .w-md-editor-text": {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            fontSize: theme.typography.body1.fontSize,
            lineHeight: theme.typography.body1.lineHeight,
          },
          "& .w-md-editor-text-pre": {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          },
          "& .w-md-editor-preview": {
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
            padding: theme.spacing(2),
          },
          "& .w-md-editor-toolbar": {
            backgroundColor: theme.palette.grey[50],
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
          "& .w-md-editor-toolbar button": {
            color: theme.palette.text.secondary,
            "&:hover": {
              backgroundColor: theme.palette.action.hover,
              color: theme.palette.text.primary,
            },
          },
          "& .w-md-editor-text-textarea": {
            "&::placeholder": {
              color: theme.palette.text.disabled,
              opacity: 1,
            },
          },
          ...(disabled && {
            opacity: 0.6,
            pointerEvents: "none",
          }),
        }}
      >
        <MDEditor
          value={value || ""}
          onChange={disabled ? undefined : onChange}
          preview="edit"
          visibleDragBar={false}
          height={minHeight}
          data-color-mode="light"
          textareaProps={{
            placeholder: placeholder || "Enter markdown content...",
            disabled: disabled,
            readOnly: disabled,
          }}
        />
      </Box>
      {helperText && (
        <FormHelperText
          error={error}
          sx={{
            mt: 0.5,
            mx: 0,
            fontSize: theme.typography.caption.fontSize,
          }}
        >
          {helperText}
        </FormHelperText>
      )}
    </Box>
  );
};

export default MarkdownEditor;
