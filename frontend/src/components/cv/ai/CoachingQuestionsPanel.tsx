/**
 * Coaching Questions Panel Component
 *
 * Displays AI-generated coaching questions to help users expand their CV content.
 * Shows specific, actionable questions based on existing content.
 */

import React, { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
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
    case 'offensive_language':
      return 'Offensive Language';
    case 'unprofessional_tone':
      return 'Unprofessional Tone';
    case 'discriminatory_content':
      return 'Discriminatory Content';
    case 'grammar_errors':
      return 'Grammar Errors';
    default:
      return 'Needs Expansion';
  }
};

/**
 * Get issue category color
 */
const getIssueCategoryColor = (category: string): 'info' | 'warning' | 'error' => {
  if (category === 'discriminatory_content' || category === 'offensive_language') {
    return 'error';
  }
  if (category === 'insufficient_content' || category === 'too_brief' || category === 'missing_achievements') {
    return 'warning';
  }
  if (category === 'grammar_errors') {
    return 'info';
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
          <Tooltip
            title={coachingItem.reasoning?.trim() ?? ''}
            disableHoverListener={!coachingItem.reasoning?.trim()}
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
          </Tooltip>
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
