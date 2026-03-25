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
 * - Auto-resize to fit content within min/max height constraints
 *
 * Usage:
 * - Used in FormField component when useMarkdownEditor is enabled
 * - Supports all standard form field props (value, onChange, error, helperText)
 * - Height auto-adjusts based on content with configurable min (rows) and max height
 */

import React, { useEffect, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import Box from "@mui/material/Box";
import FormHelperText from "@mui/material/FormHelperText";
import { useTheme } from "@mui/material/styles";
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
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState<number>(0);

  // Calculate min and max heights
  // Each row is approximately 24px (line-height) + base padding
  const minHeight = rows * 24 + 80; // Base padding for toolbar and container
  const maxHeight = Math.min(
    typeof window !== "undefined" ? window.innerHeight * 0.7 : 600,
    typeof window !== "undefined" ? window.innerHeight - 300 : 600
  );

  // Auto-resize effect that measures actual content
  useEffect(() => {
    if (!editorRef.current) return;

    const calculateHeight = () => {
      try {
        // Find the textarea element within the MDEditor
        const textarea = editorRef.current?.querySelector(
          ".w-md-editor-text-input"
        ) as HTMLTextAreaElement;

        if (!textarea) {
          // If we can't find textarea yet, use minHeight
          setEditorHeight(minHeight);
          return;
        }

        // Temporarily reset height to get accurate scrollHeight
        const previousHeight = textarea.style.height;
        textarea.style.height = "auto";

        // Get the actual content height
        const contentHeight = textarea.scrollHeight;

        // Restore previous height
        textarea.style.height = previousHeight;

        // Find the toolbar element to measure its height
        const toolbar = editorRef.current?.querySelector(
          ".w-md-editor-toolbar"
        ) as HTMLElement;
        const toolbarHeight = toolbar ? toolbar.offsetHeight : 29; // Default toolbar height

        // Calculate total required height
        // Content height + toolbar + padding/borders + buffer for proper spacing
        const totalHeight =
          contentHeight + // Actual content
          toolbarHeight + // Toolbar
          24 + // Top/bottom padding of textarea container
          2 + // Borders (1px top + 1px bottom)
          16; // Additional buffer for internal spacing

        // Clamp between min and max
        const clampedHeight = Math.max(
          minHeight,
          Math.min(maxHeight, totalHeight)
        );

        setEditorHeight(clampedHeight);
      } catch (error) {
        // Fallback to minHeight if measurement fails
        console.error("Error calculating editor height:", error);
        setEditorHeight(minHeight);
      }
    };

    // Initial calculation
    calculateHeight();

    // Recalculate on content change
    const timeoutId = setTimeout(calculateHeight, 0);

    // Recalculate on window resize
    const handleResize = () => {
      calculateHeight();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [value, minHeight, maxHeight]);

  // Use minHeight until first measurement completes
  const height = editorHeight || minHeight;

  return (
    <Box>
      <Box
        ref={editorRef}
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
          height={height}
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
