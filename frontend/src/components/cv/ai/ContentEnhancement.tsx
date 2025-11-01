/**
 * Content Enhancement Component
 *
 * This component provides AI-powered content enhancement functionality including
 * enhancement buttons for editable content and a suggestions modal for reviewing
 * and accepting AI-generated improvements.
 *
 * Key responsibilities:
 * - Render enhancement buttons for any editable content
 * - Display enhancement suggestions modal with before/after comparison
 * - Show 3-4 improved versions with confidence scores
 * - Allow one-click accept/reject for each suggestion
 * - Maintain original text as fallback option
 * - Integrate with CV sections for content updates
 *
 * Usage:
 * - EnhancementButton can be used inline with any editable content
 * - EnhancementModal is used to display and manage suggestions
 * - Integrates with AI store for state management
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Chip,
  Stack,
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Alert,
} from "@mui/material";
import {
  AutoAwesome as AutoAwesomeIcon,
  Check as CheckIcon,
  ContentCopy as CopyIcon,
  Help as HelpIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useAIStore, useSuggestions } from "../../../stores/ai";
import { ContentSuggestion } from "../../../types/ai";
import { useNotifications } from "../../../packages/notifications";
import { useAITaskPollingContext } from "../../../contexts/AITaskPollingContext";

interface EnhancementButtonProps {
  content: string;
  contentType?: string;
  cvId: string;
  onContentUpdate?: (newContent: string) => void;
  size?: "small" | "medium" | "large";
  variant?: "text" | "outlined" | "contained";
  disabled?: boolean;
  className?: string;
}

interface EnhancementModalProps {
  open: boolean;
  onClose: () => void;
  originalContent: string;
  suggestions: ContentSuggestion[];
  isLoading: boolean;
  error?: string;
  onAccept: (suggestion: ContentSuggestion) => void;
  onReject: () => void;
  onRegenerate?: () => void;
}

const EnhancementButton: React.FC<EnhancementButtonProps> = ({
  content,
  contentType = "bullet_point",
  cvId,
  onContentUpdate,
  size = "small",
  variant: _variant = "outlined",
  disabled = false,
  className,
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  // Store the enhancement response locally
  const [enhancementData, setEnhancementData] = useState<{
    suggestions: ContentSuggestion[];
    isLoading: boolean;
    error?: string;
  } | null>(null);

  const { enhanceContent } = useAIStore();
  const { showError } = useNotifications();

  // Use global AI task polling for content enhancement
  const { addTask, removeTask, activeTasks } = useAITaskPollingContext();

  // Monitor active tasks for content enhancement completion
  useEffect(() => {
    for (const [taskId, task] of activeTasks) {
      if (
        task.type === "content_enhancement" &&
        task.cvId === cvId &&
        !task.isGenerating
      ) {
        if (task.generationError) {
          showError(
            "Error",
            `Content enhancement failed: ${task.generationError}`,
          );
          setIsEnhancing(false);
          setEnhancementData(null);
        } else if (task.data) {
          // Task completed successfully, store data and show modal
          setEnhancementData({
            suggestions: task.data.suggestions || [],
            isLoading: false,
            error: task.data.generation_error,
          });
          setShowModal(true);
          setIsEnhancing(false);
        }
        removeTask(taskId);
      }
    }
  }, [activeTasks, cvId, showError, removeTask]);

  const handleEnhance = useCallback(async () => {
    if (!content.trim()) {
      showError("Error", "No content to enhance");
      return;
    }

    setIsEnhancing(true);
    setEnhancementData(null);
    try {
      const enhancementResponse = await enhanceContent(
        cvId,
        content,
        contentType,
      );

      // Add the task to polling if it's still generating
      if (
        enhancementResponse.is_generating &&
        enhancementResponse.enhancement_id
      ) {
        addTask({
          id: enhancementResponse.enhancement_id,
          type: "content_enhancement",
          cvId: cvId,
          isGenerating: true,
          data: enhancementResponse,
        });
      } else {
        // Task completed immediately - store data and show modal
        setEnhancementData({
          suggestions: enhancementResponse.suggestions || [],
          isLoading: false,
          error: enhancementResponse.generation_error,
        });
        setShowModal(true);
        setIsEnhancing(false);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to enhance content";
      showError("Error", errorMessage);
      setIsEnhancing(false);
      setEnhancementData(null);
    }
  }, [content, contentType, cvId, enhanceContent, showError, addTask]);

  const handleAccept = useCallback(
    (suggestion: ContentSuggestion) => {
      if (onContentUpdate) {
        onContentUpdate(suggestion.content);
      }
      setShowModal(false);
      setEnhancementData(null);
    },
    [onContentUpdate],
  );

  const handleReject = useCallback(() => {
    setShowModal(false);
    setEnhancementData(null);
  }, []);

  return (
    <>
      <Tooltip title="Enhance with AI">
        <span>
          <IconButton
            onClick={handleEnhance}
            disabled={disabled || isEnhancing || !content.trim()}
            size={size}
            className={className}
          >
            {isEnhancing ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
          </IconButton>
        </span>
      </Tooltip>

      {enhancementData && (
        <EnhancementModal
          open={showModal}
          onClose={handleReject}
          originalContent={content}
          suggestions={enhancementData.suggestions}
          isLoading={enhancementData.isLoading}
          error={enhancementData.error}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </>
  );
};

const EnhancementModal: React.FC<EnhancementModalProps> = ({
  open,
  onClose,
  originalContent,
  suggestions,
  isLoading,
  error,
  onAccept,
  onReject,
  onRegenerate,
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(0);
  const { showSuccess } = useNotifications();

  const handleAccept = useCallback(() => {
    if (suggestions[selectedSuggestion]) {
      onAccept(suggestions[selectedSuggestion]);
      showSuccess("Content enhanced successfully");
    }
  }, [suggestions, selectedSuggestion, onAccept, showSuccess]);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      showSuccess("Copied to clipboard");
    },
    [showSuccess],
  );

  const getConfidenceColor = (score: number) => {
    if (score >= 85) return "success";
    if (score >= 70) return "warning";
    return "error";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: "60vh" },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Enhance Content</Typography>
          {onRegenerate && (
            <Tooltip title="Regenerate Suggestions">
              <span>
                <IconButton onClick={onRegenerate} disabled={isLoading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <CircularProgress size={48} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Generating enhancement suggestions...
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Original Content */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  Original Content
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                    fontStyle: "italic",
                  }}
                >
                  {originalContent}
                </Typography>
              </CardContent>
            </Card>

            {/* Suggestions */}
            <Box>
              <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                <Typography variant="h6">
                  AI Suggestions
                </Typography>
                <Tooltip
                  title={
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Content Match Score measures:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: "16px" }}>
                        <li>Alignment with job requirements</li>
                        <li>Keyword relevance to job description</li>
                        <li>Content quality and clarity</li>
                        <li>Overall job fit for this role</li>
                      </ul>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 1, fontStyle: "italic" }}
                      >
                        Note: Score reflects job description match, not general writing quality
                      </Typography>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  <IconButton size="small" color="primary" sx={{ ml: 0.5 }}>
                    <HelpIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Choose the best enhancement for your content:
              </Typography>

              <FormControl component="fieldset">
                <RadioGroup
                  value={selectedSuggestion}
                  onChange={(e) =>
                    setSelectedSuggestion(Number(e.target.value))
                  }
                >
                  {suggestions.map((suggestion, index) => (
                    <Card
                      key={index}
                      variant="outlined"
                      sx={{
                        mb: 2,
                        border: selectedSuggestion === index ? 2 : 1,
                        borderColor:
                          selectedSuggestion === index
                            ? "primary.main"
                            : "divider",
                      }}
                    >
                      <CardContent>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          mb={1}
                        >
                          <FormControlLabel
                            value={index}
                            control={<Radio />}
                            label={`Suggestion ${index + 1}`}
                            sx={{ m: 0 }}
                          />
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={`${suggestion.confidence_score}%`}
                              color={getConfidenceColor(
                                suggestion.confidence_score,
                              )}
                              size="small"
                            />
                          </Box>
                        </Box>

                        <Typography variant="body1" paragraph>
                          {suggestion.content}
                        </Typography>

                        {suggestion.improvements.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Improvements:
                            </Typography>
                            <List dense>
                              {suggestion.improvements.map(
                                (improvement, impIndex) => (
                                  <ListItem key={impIndex} sx={{ py: 0 }}>
                                    <ListItemIcon>
                                      <TrendingUpIcon
                                        color="success"
                                        fontSize="small"
                                      />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={improvement}
                                      primaryTypographyProps={{
                                        variant: "body2",
                                      }}
                                    />
                                  </ListItem>
                                ),
                              )}
                            </List>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </RadioGroup>
              </FormControl>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onReject} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            copyToClipboard(suggestions[selectedSuggestion]?.content || "")
          }
          startIcon={<CopyIcon />}
          disabled={isLoading || suggestions.length === 0}
        >
          Copy
        </Button>
        <Button
          onClick={handleAccept}
          variant="contained"
          startIcon={<CheckIcon />}
          disabled={isLoading || suggestions.length === 0}
        >
          Use This Version
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Export both components
export { EnhancementButton, EnhancementModal };
export default EnhancementButton;
