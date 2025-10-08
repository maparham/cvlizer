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
 * - Supports line clamp for truncated previews
 * - Integrates seamlessly with Material-UI theme
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Typography, Link, Box, List, ListItem } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

interface MarkdownRendererProps {
  content: string;
  variant?: 'body1' | 'body2' | 'caption';
  color?: string;
  lineClamp?: number;
  sx?: SxProps<Theme>;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  variant = 'body2',
  color = 'text.secondary',
  lineClamp,
  sx = {},
}) => {
  if (!content) {
    return null;
  }

  // Wrapper styles for line clamping
  const wrapperSx: SxProps<Theme> = lineClamp
    ? {
        display: '-webkit-box',
        WebkitLineClamp: lineClamp,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        ...sx,
      }
    : sx;

  return (
    <Box sx={wrapperSx}>
      <ReactMarkdown
        components={{
          // Headings
          h1: ({ children }) => (
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, mt: 2, color }}>
              {children}
            </Typography>
          ),
          h2: ({ children }) => (
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, mt: 1.5, color }}>
              {children}
            </Typography>
          ),
          h3: ({ children }) => (
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, mt: 1, color }}>
              {children}
            </Typography>
          ),
          h4: ({ children }) => (
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, mt: 1, color }}>
              {children}
            </Typography>
          ),
          h5: ({ children }) => (
            <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 0.5, color }}>
              {children}
            </Typography>
          ),
          h6: ({ children }) => (
            <Typography variant="caption" sx={{ fontWeight: 500, mb: 0.5, color }}>
              {children}
            </Typography>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <Typography variant={variant} sx={{ mb: 1, color, lineHeight: 1.6 }}>
              {children}
            </Typography>
          ),
          
          // Lists
          ul: ({ children }) => (
            <List dense sx={{ py: 0, pl: 2 }}>
              {children}
            </List>
          ),
          ol: ({ children }) => (
            <List dense component="ol" sx={{ py: 0, pl: 2 }}>
              {children}
            </List>
          ),
          li: ({ children }) => (
            <ListItem sx={{ display: 'list-item', py: 0.25, px: 0 }}>
              <Typography variant={variant} sx={{ color, lineHeight: 1.6 }}>
                {children}
              </Typography>
            </ListItem>
          ),
          
          // Links
          a: ({ href, children }) => (
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'primary.main' }}
            >
              {children}
            </Link>
          ),
          
          // Strong/Bold
          strong: ({ children }) => (
            <Typography component="span" sx={{ fontWeight: 700, color }}>
              {children}
            </Typography>
          ),
          
          // Emphasis/Italic
          em: ({ children }) => (
            <Typography component="span" sx={{ fontStyle: 'italic', color }}>
              {children}
            </Typography>
          ),
          
          // Code (inline)
          code: ({ children }) => (
            <Typography
              component="code"
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.9em',
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
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: 2,
                borderRadius: 1,
                overflow: 'auto',
                mb: 1,
              }}
            >
              <Typography
                component="code"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
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
                borderLeft: '4px solid',
                borderColor: 'primary.light',
                pl: 2,
                ml: 0,
                my: 1,
                fontStyle: 'italic',
              }}
            >
              <Typography variant={variant} sx={{ color }}>
                {children}
              </Typography>
            </Box>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownRenderer;

