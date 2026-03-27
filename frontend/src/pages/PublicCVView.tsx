import React, { useEffect, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { Link as RouterLink, useParams } from "react-router-dom";

import PublicCVContentArea from "../components/cv/core/PublicCVContentArea";
import { PublicCVEditorStubProvider } from "../contexts/CVEditorContext";
import { OverwriteConfirmProvider } from "../contexts/OverwriteConfirmContext";
import { shareService } from "../services/shareService";
import type { PublicCVData } from "../types/share";
import type { CVData } from "../types/cv";

const publicAppName = import.meta.env.VITE_APP_NAME;

const PublicCVView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicCVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const profilePictureUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError("Missing token.");
        setLoading(false);
        return;
      }
      try {
        const response = await shareService.getPublicCV(token);
        setData(response);
      } catch {
        setError("This CV link is invalid or no longer available.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    const parsed = data?.parsed_data as unknown as CVData | undefined;
    const hasPic = Boolean(parsed?.personal_info?.profile_picture);
    if (!token || !hasPic) {
      if (profilePictureUrlRef.current) {
        window.URL.revokeObjectURL(profilePictureUrlRef.current);
        profilePictureUrlRef.current = null;
      }
      setProfilePictureUrl(null);
      return;
    }

    let cancelled = false;
    void shareService.getPublicCVProfilePictureObjectUrl(token).then((url) => {
      if (cancelled) {
        if (url) window.URL.revokeObjectURL(url);
        return;
      }
      if (!url) {
        setProfilePictureUrl(null);
        return;
      }
      if (profilePictureUrlRef.current) {
        window.URL.revokeObjectURL(profilePictureUrlRef.current);
      }
      profilePictureUrlRef.current = url;
      setProfilePictureUrl(url);
    });

    return () => {
      cancelled = true;
      if (profilePictureUrlRef.current) {
        window.URL.revokeObjectURL(profilePictureUrlRef.current);
        profilePictureUrlRef.current = null;
      }
    };
  }, [token, data?.parsed_data]);

  const handleDownload = async () => {
    if (!token) return;
    await shareService.downloadPublicCVPDF(token);
  };

  const renderPublicCVContent = () => {
    if (!data?.parsed_data) {
      return (
        <Paper sx={{ p: 4 }}>
          <Typography color="text.secondary">No CV content available.</Typography>
        </Paper>
      );
    }

    const cvData = data.parsed_data as unknown as CVData;
    return (
      <OverwriteConfirmProvider>
        <PublicCVEditorStubProvider cvData={cvData}>
          <PublicCVContentArea
            cvData={cvData}
            readOnlyProfilePictureUrl={profilePictureUrl}
          />
        </PublicCVEditorStubProvider>
      </OverwriteConfirmProvider>
    );
  };

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

    return renderPublicCVContent();
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
              // xs: three rows (brand, date, actions); sm+: brand | date | actions in one row
              gridTemplateColumns: {
                xs: "1fr",
                sm: "minmax(0, 1fr) auto auto",
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
              {showMetadataHeader && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleDownload}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  Download PDF
                </Button>
              )}
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

export default PublicCVView;
