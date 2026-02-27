/**
 * Markdown Renderer Component
 *
 * This component provides a reusable markdown renderer with Material-UI styling.
 * It uses react-markdown to parse and render markdown content with custom renderers
 * for seamless integration with Material-UI design system.
 *
 * Key responsibilities:
 * - Render markdown content with Material-UI components
 * - Support line clamping for preview contexts
 * - Handle empty or null content gracefully
 * - Provide consistent typography styling
 * - Support custom styling via sx prop
 *
 * Usage:
 * - Use for displaying any markdown content (job descriptions, AI-generated content, etc.)
 * - Single newlines are converted to <br /> and rendered as line breaks (rehype-raw) so CV description line structure is preserved.
 * - Supports line clamp for truncated previews
 * - Integrates seamlessly with Material-UI theme
 */

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Typography, Link, Box } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";

interface MarkdownRendererProps {
  content: string;
  variant?: "body1" | "body2" | "caption";
  color?: string;
  lineClamp?: number;
  sx?: SxProps<Theme>;
  diffMode?: boolean; // Enable diff-specific styling for strikethrough and bold
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  variant = "body2",
  color = "text.secondary",
  lineClamp,
  sx = {},
  diffMode = false,
}) => {
  if (!content) {
    return null;
  }

  // Convert single newlines to an HTML block "<br />" on its own line so it parses and renders as a line break.
  // Inline <br /> can be stripped by parsers; block-level is reliable. Double newlines preserved.
  const contentWithBreaks = content.replace(/([^\n])\n([^\n])/g, "$1\n<br />\n$2");

  // Wrapper styles for line clamping
  const wrapperSx: SxProps<Theme> = lineClamp
    ? {
        display: "-webkit-box",
        WebkitLineClamp: lineClamp,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        mr: 0, // Ensure no right margin
        ...sx,
      }
    : { display: "block", mr: 0, ...sx };

  return (
    <Box sx={wrapperSx}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          br: () => <br />,
          // Headings
          h1: ({ children }) => (
            <Typography
              variant="h5"
              sx={{ fontWeight: 600, mb: 1, mt: 2, color }}
            >
              {children}
            </Typography>
          ),
          h2: ({ children }) => (
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 1, mt: 1.5, color }}
            >
              {children}
            </Typography>
          ),
          h3: ({ children }) => (
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 0.5, mt: 1, color }}
            >
              {children}
            </Typography>
          ),
          h4: ({ children }) => (
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, mb: 0.5, mt: 1, color }}
            >
              {children}
            </Typography>
          ),
          h5: ({ children }) => (
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 500, mb: 0.5, color }}
            >
              {children}
            </Typography>
          ),
          h6: ({ children }) => (
            <Typography
              variant="caption"
              sx={{ fontWeight: 500, mb: 0.5, color }}
            >
              {children}
            </Typography>
          ),

          // Paragraphs
          p: ({ children }) => (
            <Typography
              variant={variant}
              sx={{
                mb: 1,
                color,
                lineHeight: 1.6,
                mr: 0,
                textAlign: "inherit",
              }}
            >
              {children}
            </Typography>
          ),

          // Lists
          ul: ({ children }) => (
            <Box component="ul" sx={{ py: 0, pl: 2, mb: 1 }}>
              {children}
            </Box>
          ),
          ol: ({ children }) => (
            <Box component="ol" sx={{ py: 0, pl: 2, mb: 1 }}>
              {children}
            </Box>
          ),
          li: ({ children }) => (
            <Typography
              component="li"
              variant={variant}
              sx={{ color, lineHeight: 1.6, mb: 0.25 }}
            >
              {children}
            </Typography>
          ),

          // Links
          a: ({ href, children }) => (
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "primary.main" }}
            >
              {children}
            </Link>
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <Typography
              component="span"
              sx={
                diffMode
                  ? {
                      // Diff mode: added text styling
                      backgroundColor: "#e8f5e9",
                      color: "#2e7d32",
                      fontWeight: 500,
                      padding: "2px 4px",
                      borderRadius: "2px",
                    }
                  : {
                      // Normal mode: standard bold
                      fontWeight: 700,
                      color,
                    }
              }
            >
              {children}
            </Typography>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <Typography component="span" sx={{ fontStyle: "italic", color }}>
              {children}
            </Typography>
          ),

          // Strikethrough/Deleted text (only styled in diff mode)
          del: ({ children }) => (
            <Typography
              component="span"
              sx={
                diffMode
                  ? {
                      // Diff mode: removed text styling
                      backgroundColor: "#ffebee",
                      color: "#c62828",
                      textDecoration: "line-through",
                      padding: "2px 4px",
                      borderRadius: "2px",
                    }
                  : {
                      // Normal mode: standard strikethrough
                      textDecoration: "line-through",
                      color,
                    }
              }
            >
              {children}
            </Typography>
          ),

          // Code (inline)
          code: ({ children }) => (
            <Typography
              component="code"
              sx={{
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                padding: "2px 6px",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.9em",
                color,
              }}
            >
              {children}
            </Typography>
          ),

          // Code block
          pre: ({ children }) => (
            <Box
              component="pre"
              sx={{
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                padding: 2,
                borderRadius: 1,
                overflow: "auto",
                mb: 1,
              }}
            >
              <Typography
                component="code"
                sx={{
                  fontFamily: "monospace",
                  fontSize: "0.9em",
                  color,
                }}
              >
                {children}
              </Typography>
            </Box>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <Box
              component="blockquote"
              sx={{
                borderLeft: "4px solid",
                borderColor: "primary.light",
                pl: 2,
                ml: 0,
                my: 1,
                fontStyle: "italic",
              }}
            >
              <Typography variant={variant} sx={{ color }}>
                {children}
              </Typography>
            </Box>
          ),
        }}
      >
        {contentWithBreaks}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownRenderer;
