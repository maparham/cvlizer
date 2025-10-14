/**
 * CV Template Selector Component
 *
 * This module provides a template selection dialog for creating new CVs with predefined structures.
 * It offers three templates (Student, Professional, Executive) with appropriate section ordering
 * and sample field placeholders, plus an option to start from scratch.
 *
 * Key responsibilities:
 * - Display template options with visual previews
 * - Handle template selection and CV creation
 * - Provide "Start from Scratch" option
 * - Integrate with existing CV creation flow
 *
 * Usage:
 * - Used in Dashboard when creating blank CVs
 * - Provides structured starting points for different career levels
 * - Maintains compatibility with existing CV data schema
 */
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  IconButton,
} from "@mui/material";
import {
  School as SchoolIcon,
  Work as WorkIcon,
  Business as BusinessIcon,
  Close as CloseIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { commonStyles } from "../../styles/commonStyles";
import { CV_TEMPLATES, CVTemplate } from "../../data/cvTemplates";

// Template display configuration with icons and colors
interface CVTemplateDisplay extends CVTemplate {
  icon: React.ReactNode;
  color: string;
}

const TEMPLATE_DISPLAY_CONFIG: CVTemplateDisplay[] = CV_TEMPLATES.map(
  (template, index) => {
    const icons = [<SchoolIcon />, <WorkIcon />, <BusinessIcon />];
    const colors = ["#1976d2", "#2e7d32", "#d32f2f"];

    return {
      ...template,
      icon: icons[index] || <WorkIcon />,
      color: colors[index] || "#666",
    };
  },
);

interface CVTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (_template: CVTemplate | null) => void;
}

const CVTemplateSelector: React.FC<CVTemplateSelectorProps> = ({
  open,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate | null>(
    null,
  );

  const handleTemplateSelect = (template: CVTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirm = () => {
    onSelectTemplate(selectedTemplate);
    setSelectedTemplate(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: commonStyles.dialog,
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={commonStyles.flex.between}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Choose a CV Template
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Select a template to get started quickly
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={3}>
          {TEMPLATE_DISPLAY_CONFIG.map((template) => (
            <Grid item xs={12} md={4} key={template.id}>
              <Card
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  border: selectedTemplate?.id === template.id ? 2 : 1,
                  borderColor:
                    selectedTemplate?.id === template.id
                      ? template.color
                      : "divider",
                  ...commonStyles.card.standard,
                }}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: commonStyles.borderRadius.medium,
                        backgroundColor: `${template.color}20`,
                        color: template.color,
                        mr: 2,
                      }}
                    >
                      {template.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, mb: 0.5 }}
                      >
                        {template.name}
                      </Typography>
                      {selectedTemplate?.id === template.id && (
                        <Chip
                          icon={<CheckIcon />}
                          label="Selected"
                          size="small"
                          sx={{
                            backgroundColor: template.color,
                            color: "white",
                            "& .MuiChip-icon": { color: "white" },
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {template.description}
                  </Typography>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Includes:
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {template.sections.map((section, index) => (
                        <Chip
                          key={index}
                          label={section}
                          size="small"
                          variant="outlined"
                          sx={{ mb: 0.5, ...commonStyles.chip.small }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <DialogActions sx={commonStyles.dialogActions}>
        <Button onClick={handleClose} sx={commonStyles.button.secondary}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedTemplate}
          sx={commonStyles.button.primary}
        >
          Create CV with Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVTemplateSelector;
