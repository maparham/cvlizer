/**
 * Export Page - Template Gallery with Live Previews
 *
 * This module provides the export page where users can preview and select
 * CV templates with live blurred previews of their CV data rendered with
 * different template styles.
 *
 * Key features:
 * - Template gallery with card-based layout
 * - Live blurred preview generation for each template
 * - Async preview generation with polling
 * - Auto-load default template preview on mount
 * - Export with selected template functionality
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { cvApi } from "../services/api";

interface Template {
  name: string;
  displayName: string;
  description: string;
}

interface TemplatePreview {
  name: string;
  status: "pending" | "loading" | "completed" | "failed";
  previewUrls?: string[];  // Changed to array for multiple pages
  pageCount?: number;
  jobId?: string;
  error?: string;
}

export const ExportPage: React.FC = () => {
  const { cvId } = useParams<{ cvId: string }>();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previews, setPreviews] = useState<Record<string, TemplatePreview>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<{
    template: Template;
    previewUrls: string[];
    pageCount: number;
  } | null>(null);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await cvApi.getAvailableTemplates();
        setTemplates(data);

        // Initialize preview state for each template
        const initialPreviews: Record<string, TemplatePreview> = {};
        data.forEach((template: Template) => {
          initialPreviews[template.name] = {
            name: template.name,
            status: "pending",
          };
        });
        setPreviews(initialPreviews);

        // Start preview generation for all templates
        startPreviews(data);
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        setLoading(false);
      }
    };

    if (cvId) {
      loadTemplates();
    }
  }, [cvId]);

  const startPreviews = async (templateList: Template[]) => {
    for (const template of templateList) {
      try {
        // Start preview generation
        const result = await cvApi.startPreviewGeneration(cvId!, template.name);

        setPreviews((prev) => ({
          ...prev,
          [template.name]: {
            ...prev[template.name],
            status: "loading",
            jobId: result.job_id,
          },
        }));

        // Start polling for this template
        pollPreviewStatus(template.name, result.job_id);
      } catch (error) {
        console.error(`Failed to start preview for ${template.name}:`, error);
        setPreviews((prev) => ({
          ...prev,
          [template.name]: {
            ...prev[template.name],
            status: "failed",
            error: "Failed to start preview generation",
          },
        }));
      }
    }
  };

  const pollPreviewStatus = async (templateName: string, jobId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds max (2 second intervals)

    const poll = async () => {
      try {
        const status = await cvApi.checkPreviewStatus(cvId!, jobId);

        if (status.status === "completed") {
          // Fetch all preview images (all pages)
          const pageCount = status.page_count || 1;
          const imageUrls = await cvApi.fetchAllPreviewImages(cvId!, jobId, pageCount);

          setPreviews((prev) => ({
            ...prev,
            [templateName]: {
              ...prev[templateName],
              status: "completed",
              previewUrls: imageUrls,
              pageCount: pageCount,
            },
          }));
        } else if (status.status === "failed") {
          setPreviews((prev) => ({
            ...prev,
            [templateName]: {
              ...prev[templateName],
              status: "failed",
              error: status.error || "Preview generation failed",
            },
          }));
        } else if (attempts < maxAttempts && status.status === "pending") {
          attempts++;
          setTimeout(poll, 2000);
        } else if (attempts >= maxAttempts) {
          setPreviews((prev) => ({
            ...prev,
            [templateName]: {
              ...prev[templateName],
              status: "failed",
              error: "Preview generation timeout",
            },
          }));
        }
      } catch (error) {
        console.error(`Failed to check preview status for ${templateName}:`, error);
        setPreviews((prev) => ({
          ...prev,
          [templateName]: {
            ...prev[templateName],
            status: "failed",
            error: "Failed to check preview status",
          },
        }));
      }
    };

    poll();
  };

  const handleExport = async (templateName: string) => {
    if (!cvId) return;

    try {
      await cvApi.exportCVAsPDF(cvId, templateName);
    } catch (error) {
      console.error("Failed to export CV:", error);
    }
  };

  const handleBack = () => {
    navigate(`/cv/${cvId}`);
  };

  const handlePreviewClick = (template: Template, previewUrls: string[], pageCount: number) => {
    setSelectedPreview({ template, previewUrls, pageCount });
  };

  const handleClosePreview = () => {
    setSelectedPreview(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      {/* Header */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", backgroundColor: "background.paper" }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", py: 2 }}>
            <IconButton onClick={handleBack} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" component="h1">
              Export CV
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Choose a template for your CV
        </Typography>

        <Grid container spacing={3}>
          {templates.map((template) => {
            const preview = previews[template.name];
            const isDefault = template.name === "modern";


            return (
              <Grid item xs={12} sm={6} md={4} key={template.name}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    border: isDefault ? 2 : 1,
                    borderColor: isDefault ? "primary.main" : "divider",
                    "&:hover": {
                      boxShadow: 4,
                    },
                  }}
                >
                  {/* Preview Image */}
                  <Box
                    sx={{
                      width: "100%",
                      height: "300px",
                      backgroundColor: "grey.100",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {preview?.status === "completed" && preview.previewUrls && preview.previewUrls.length > 0 ? (
                      <img
                        src={preview.previewUrls[0]}
                        alt={`${template.displayName} preview (page 1)`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          cursor: "pointer",
                        }}
                        onClick={() => handlePreviewClick(template, preview.previewUrls!, preview.pageCount || 1)}
                      />
                    ) : preview?.status === "loading" ? (
                      <CircularProgress />
                    ) : preview?.status === "failed" ? (
                      <Typography variant="body2" color="error">
                        Preview failed
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Loading preview...
                      </Typography>
                    )}

                    {isDefault && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          backgroundColor: "primary.main",
                          color: "primary.contrastText",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        DEFAULT
                      </Box>
                    )}
                  </Box>

                  {/* Card Content */}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {template.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                    {preview?.error && (
                      <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                        {preview.error}
                      </Typography>
                    )}
                  </CardContent>

                  {/* Card Actions */}
                  <CardActions>
                    <Button
                      variant={isDefault ? "contained" : "outlined"}
                      fullWidth
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => handleExport(template.name)}
                      disabled={preview?.status === "loading"}
                    >
                      {preview?.status === "loading" ? "Generating..." : "Export"}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      {/* Preview Modal */}
      {selectedPreview && (
        <Dialog
          open={true}
          onClose={handleClosePreview}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6">
                {selectedPreview.template.displayName} Template Preview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedPreview.pageCount} {selectedPreview.pageCount === 1 ? 'page' : 'pages'}
              </Typography>
            </Box>
            <IconButton onClick={handleClosePreview} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ flex: 1, p: 2, overflowY: "auto" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
              {selectedPreview.previewUrls.map((url, index) => (
                <Box key={index} sx={{ width: "100%", maxWidth: "800px" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Page {index + 1} of {selectedPreview.pageCount}
                  </Typography>
                  <img
                    src={url}
                    alt={`${selectedPreview.template.displayName} preview page ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "auto",
                      objectFit: "contain",
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                    }}
                  />
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePreview}>Close</Button>
            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => {
                handleExport(selectedPreview.template.name);
                handleClosePreview();
              }}
            >
              Export with this template
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default ExportPage;
