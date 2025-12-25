/**
 * Coaching Questions Panel Component
 *
 * Displays AI-generated coaching questions to help users expand their CV content.
 * Shows specific, actionable questions based on existing content.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { ContentCoachingItem } from '../../../types/ai';
import { useCVQualityStore } from '../../../stores/cvQualityStore';

interface CoachingQuestionsPanelProps {
  coachingItem: ContentCoachingItem;
}

/**
 * Get issue category label
 */
const getIssueCategoryLabel = (category: string): string => {
  switch (category) {
    case 'insufficient_content':
      return 'Insufficient Content';
    case 'missing_impact':
      return 'Missing Impact';
    case 'too_brief':
      return 'Too Brief';
    case 'missing_achievements':
      return 'Missing Achievements';
    case 'lacks_specificity':
      return 'Lacks Specificity';
    case 'missing_context':
      return 'Missing Context';
    case 'weak_action_verbs':
      return 'Weak Action Verbs';
    default:
      return 'Needs Expansion';
  }
};

/**
 * Get issue category color
 */
const getIssueCategoryColor = (category: string): 'info' | 'warning' => {
  if (category === 'insufficient_content' || category === 'too_brief' || category === 'missing_achievements') {
    return 'warning';
  }
  return 'info';
};

export const CoachingQuestionsPanel: React.FC<CoachingQuestionsPanelProps> = ({
  coachingItem,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { dismissContentCoaching } = useCVQualityStore();

  const handleDismiss = async () => {
    await dismissContentCoaching(coachingItem.item_id);
  };

  return (
    <Box sx={{ my: 2 }}>
      <Accordion
        expanded={expanded}
        onChange={() => setExpanded(!expanded)}
        sx={{
          border: '1px solid',
          borderColor: 'info.main',
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(33, 150, 243, 0.05)'
              : 'rgba(33, 150, 243, 0.02)',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <HelpOutlineIcon color="info" />
            <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>
              Coaching Questions
            </Typography>
            <Chip
              label={getIssueCategoryLabel(coachingItem.issue_category)}
              size="small"
              color={getIssueCategoryColor(coachingItem.issue_category)}
            />
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              sx={{ ml: 1 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            {/* Coaching Questions */}
            {coachingItem.coaching_questions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Consider these questions to expand your content:
                </Typography>
                <List dense>
                  {coachingItem.coaching_questions.map((q, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <LightbulbOutlinedIcon fontSize="small" color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary={q.question}
                        primaryTypographyProps={{
                          variant: 'body2',
                          color: 'text.primary',
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Direct Prompts */}
            {coachingItem.direct_prompts.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Action items:
                </Typography>
                <List dense>
                  {coachingItem.direct_prompts.map((prompt, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Typography variant="body2" color="info.main" sx={{ fontWeight: 600 }}>
                          {idx + 1}.
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={prompt}
                        primaryTypographyProps={{
                          variant: 'body2',
                          color: 'text.primary',
                          fontWeight: 500,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
