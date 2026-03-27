import React, { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useParams } from "react-router-dom";

import { MarkdownRenderer } from "../components/common";
import { shareService } from "../services/shareService";
import type { PublicJobDescriptionData } from "../types/share";

const publicAppName = import.meta.env.VITE_APP_NAME;

const PublicJobDescriptionView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicJobDescriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError("Missing token.");
        setLoading(false);
        return;
      }
      try {
        const response = await shareService.getPublicJobDescription(token);
        setData(response);
      } catch {
        setError("This job description link is invalid or no longer available.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const renderStatusContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" color="error" gutterBottom>
            Link unavailable
          </Typography>
          <Typography>{error}</Typography>
        </Paper>
      );
    }

    if (!data) {
      return null;
    }

    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {data.title || "Job Description"}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {[data.company, data.location].filter(Boolean).join(" - ")}
        </Typography>
        {data.source_url && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Source:{" "}
            <a href={data.source_url} target="_blank" rel="noreferrer">
              {data.source_url}
            </a>
          </Typography>
        )}
        <MarkdownRenderer content={data.content || ""} />
      </Paper>
    );
  };

  const showMetadataHeader = !loading && !error && Boolean(data);
  const modifiedDateLabel = data?.updated_at
    ? new Date(data.updated_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Box
      sx={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        bgcolor: "grey.100",
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        color="transparent"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              width: "100%",
              py: 0.5,
              display: "grid",
              alignItems: "center",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "minmax(0, 1fr) auto minmax(0, 1fr)",
              },
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <RouterLink
                to="/"
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <Box
                  component="img"
                  src="/logo.png"
                  alt=""
                  sx={{
                    height: 40,
                    width: "auto",
                    display: "block",
                    flexShrink: 0,
                  }}
                />
                <Typography variant="h6" color="text.primary" noWrap component="span">
                  {publicAppName}
                </Typography>
              </RouterLink>
            </Box>

            <Box sx={{ minWidth: 0, justifySelf: "center" }}>
              {showMetadataHeader && modifiedDateLabel && (
                <Typography variant="subtitle2" color="text.secondary" noWrap>
                  Updated on {modifiedDateLabel}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                gap: 1,
                justifySelf: "end",
                flexShrink: 0,
                width: { xs: "100%", sm: "auto" },
                alignSelf: { xs: "stretch", sm: "end" },
                minWidth: { xs: 0, sm: "max-content" },
              }}
            >
              <Button
                variant="outlined"
                size="small"
                component={RouterLink}
                to="/quick-start"
                target="_blank"
                rel="noreferrer"
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                }}
              >
                Create your own CV
              </Button>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <Container maxWidth="md" sx={{ py: 4 }}>
          {renderStatusContent()}
        </Container>
      </Box>
    </Box>
  );
};

export default PublicJobDescriptionView;
