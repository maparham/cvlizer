/**
 * Home Page Component
 *
 * Landing page for the Resume Coach (Rahkar) application. Explains the product in three
 * steps and offers primary actions (quick start, dashboard, sign-in) depending
 * on auth state. Sticky hero and "How it works" section with horizontal slides.
 *
 * Rendered at the root route ("/"). Uses Clerk (SignedIn, SignedOut, UserButton,
 * openSignIn). Responsive, Material-UI, single column top to bottom.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  Container,
  Button,
  Box,
  Typography,
  Link,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  OpenInFull,
  Fullscreen,
  FullscreenExit,
  Close,
} from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  UserButton,
  useClerk,
} from "@clerk/clerk-react";
import {
  HowItWorksSection,
  ComparisonSection,
  COMPARISON_ROWS,
} from "../components/home";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { openSignIn } = useClerk();
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dialogVideoRef = useRef<HTMLVideoElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [heroDuration, setHeroDuration] = useState<number>(0);
  const [heroRemaining, setHeroRemaining] = useState<number>(0);
  const [dialogDuration, setDialogDuration] = useState<number>(0);
  const [dialogRemaining, setDialogRemaining] = useState<number>(0);

  const formatRemaining = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")} left`;
  };

  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const el = heroVideoRef.current;
    if (!el) return;
    const onLoadedMetadata = () => {
      const d = el.duration;
      if (Number.isFinite(d)) {
        setHeroDuration(d);
        setHeroRemaining(d);
      }
    };
    const onTimeUpdate = () => {
      const d = el.duration;
      const t = el.currentTime;
      if (Number.isFinite(d) && Number.isFinite(t)) {
        const remaining = Math.max(0, d - t);
        setHeroRemaining(remaining);
        if (remaining <= 0) setHeroRemaining(d);
      }
    };
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    if (el.readyState >= 1 && Number.isFinite(el.duration)) {
      setHeroDuration(el.duration);
      setHeroRemaining(Math.max(0, el.duration - el.currentTime));
    }
    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, []);

  useEffect(() => {
    const el = dialogVideoRef.current;
    if (!el || !videoDialogOpen) return;
    const onLoadedMetadata = () => {
      const d = el.duration;
      if (Number.isFinite(d)) {
        setDialogDuration(d);
        setDialogRemaining(d);
      }
    };
    const onTimeUpdate = () => {
      const d = el.duration;
      const t = el.currentTime;
      if (Number.isFinite(d) && Number.isFinite(t)) {
        const remaining = Math.max(0, d - t);
        setDialogRemaining(remaining);
        if (remaining <= 0) setDialogRemaining(d);
      }
    };
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    if (el.readyState >= 1 && Number.isFinite(el.duration)) {
      setDialogDuration(el.duration);
      setDialogRemaining(Math.max(0, el.duration - el.currentTime));
    }
    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  });

  const primaryButtonSx = {
    fontWeight: 600,
    textTransform: "none" as const,
    px: 3,
    py: 1.25,
    borderRadius: 999,
    boxShadow: 2,
    "&:hover": {
      boxShadow: 4,
      transform: "translateY(-1px)",
    },
    transition: "all 0.2s ease-in-out",
  };

  const outlinedButtonSx = {
    fontWeight: 600,
    textTransform: "none" as const,
    px: 3,
    py: 1.25,
    borderRadius: 999,
    borderWidth: 2,
    "&:hover": {
      borderWidth: 2,
      bgcolor: "action.hover",
    },
    transition: "all 0.2s ease-in-out",
  };

  const scrollToHowItWorks = () => {
    const section = document.getElementById("how-it-works");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleVideoDialogClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setVideoDialogOpen(false);
  };

  const toggleFullscreen = () => {
    if (!dialogVideoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      dialogVideoRef.current.requestFullscreen();
    }
  };

  return (
    <Box>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          py: 1,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box
                component="img"
                src="/logo.png"
                alt="RAHKAR"
                sx={{
                  height: 36,
                  width: "auto",
                  display: "block",
                }}
              />
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                }}
              >
                Rahkar Resume and CV Studio
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Button
                variant="text"
                size="small"
                onClick={scrollToHowItWorks}
                sx={{
                  textTransform: "none",
                  display: { xs: "none", sm: "inline-flex" },
                }}
              >
                How it works
              </Button>
              <SignedIn>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate("/quick-start")}
                  sx={outlinedButtonSx}
                >
                  Quick Start
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate("/dashboard")}
                  sx={primaryButtonSx}
                >
                  Dashboard
                </Button>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: {
                        width: "40px",
                        height: "40px",
                      },
                    },
                  }}
                />
              </SignedIn>
              <SignedOut>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => openSignIn()}
                  sx={outlinedButtonSx}
                >
                  Log In / Sign Up
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate("/quick-start")}
                  sx={primaryButtonSx}
                >
                  Try It Now
                </Button>
              </SignedOut>
            </Box>
          </Box>
        </Container>
      </Box>

      <Box
        component="main"
        sx={{
          bgcolor: "grey.50",
          borderBottom: 1,
          borderColor: "divider",
          py: { xs: 5, md: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column-reverse", md: "row" },
              alignItems: { xs: "flex-start", md: "center" },
              gap: { xs: 4, md: 6 },
            }}
          >
            <Box sx={{ flex: { xs: "1 1 auto", md: "0 0 45%" } }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.06em",
                  mb: 0.5,
                }}
              >
                A resume that{" "}
                <Box
                  component="span"
                  sx={{ whiteSpace: "nowrap" }}
                >
                  reflects{" "}
                  <Box
                    component="span"
                    sx={{ color: "primary.main", fontWeight: 800 }}
                  >
                    you
                  </Box>
                  .
                </Box>
              </Typography>
              <Typography
                variant="subtitle1"
                component="p"
                sx={{
                  fontWeight: 600,
                  color: "text.secondary",
                  mb: 2.5,
                  letterSpacing: "-0.035em",
                }}
              >
                Your voice, powered by GPT and ChatGPT (GPT-5), so real people read it.
              </Typography>
              <Stack spacing={2} sx={{ mb: 3, maxWidth: 460 }}>
                {COMPARISON_ROWS.map((row) => (
                  <Box key={row.feature} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                    <Box
                      sx={{
                        color: "primary.main",
                        mt: 0.25,
                        flexShrink: 0,
                        "& .MuiSvgIcon-root": { fontSize: 20 },
                      }}
                    >
                      {row.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        component="h3"
                        sx={{
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                          mb: 0.25,
                          color: "text.primary",
                        }}
                      >
                        {row.feature}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "primary.main",
                          fontWeight: 600,
                          lineHeight: 1.4,
                        }}
                      >
                        {row.rahkar}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1.5,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate("/quick-start")}
                  sx={primaryButtonSx}
                >
                  Get started free
                </Button>
                <Button
                  variant="text"
                  size="large"
                  onClick={scrollToHowItWorks}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  See how it works
                </Button>
              </Box>
            </Box>
            <Box
              sx={{
                flex: { xs: "1 1 auto", md: "0 0 55%" },
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 540,
                  borderRadius: 4,
                  boxShadow: 4,
                  overflow: "hidden",
                  bgcolor: "background.paper",
                  p: { xs: 1.5, md: 2 },
                }}
              >
                <Box
                  component="video"
                  ref={heroVideoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-label="Example resume preview"
                  sx={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    borderRadius: 3,
                  }}
                >
                  <source src="/home-showcase/hero-demo.webm" type="video/webm" />
                  <source src="/home-showcase/hero-demo.mp4" type="video/mp4" />
                </Box>
                {formatRemaining(heroRemaining) && (
                  <Typography
                    component="span"
                    sx={{
                      position: "absolute",
                      bottom: 16,
                      right: 16,
                      zIndex: 1,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: "rgba(0,0,0,0.6)",
                      color: "white",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {formatRemaining(heroRemaining)}
                  </Typography>
                )}
                <Tooltip title="View full size">
                  <IconButton
                    onClick={() => setVideoDialogOpen(true)}
                    aria-label="Enlarge video"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      zIndex: 1,
                      bgcolor: "rgba(0,0,0,0.5)",
                      color: "white",
                      "&:hover": {
                        bgcolor: "rgba(0,0,0,0.7)",
                      },
                    }}
                  >
                    <OpenInFull fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <HowItWorksSection />

      <ComparisonSection />

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Link
              component={RouterLink}
              to="/legal"
              variant="body2"
              color="text.secondary"
              sx={{ textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              Privacy & Terms
            </Link>
            <Link
              component={RouterLink}
              to="/feedback"
              variant="body2"
              color="text.secondary"
              sx={{ textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              Feedback
            </Link>
          </Box>
        </Container>
      </Box>

      <Dialog
        open={videoDialogOpen}
        onClose={handleVideoDialogClose}
        maxWidth={false}
        PaperProps={{
          sx: {
            maxWidth: "95vw",
            width: "auto",
          },
        }}
        aria-labelledby="video-dialog-title"
      >
        <DialogTitle id="video-dialog-title">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {formatTime(dialogRemaining) ? (
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 700,
                  color: "primary.main",
                  fontSize: "1.1rem",
                }}
              >
                {formatTime(dialogRemaining)}
              </Typography>
            ) : null}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                <IconButton
                  onClick={toggleFullscreen}
                  aria-label={
                    isFullscreen ? "Exit fullscreen" : "Fullscreen"
                  }
                  size="small"
                >
                  {isFullscreen ? (
                    <FullscreenExit fontSize="small" />
                  ) : (
                    <Fullscreen fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={handleVideoDialogClose}
                aria-label="Close"
                size="small"
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box
            component="video"
            ref={dialogVideoRef}
            autoPlay
            muted
            loop
            playsInline
            aria-label="Example CV preview"
            sx={{
              width: 1280,
              maxWidth: "100%",
              height: "auto",
              display: "block",
            }}
          >
            <source src="/home-showcase/hero-demo.webm" type="video/webm" />
            <source src="/home-showcase/hero-demo.mp4" type="video/mp4" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleVideoDialogClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Home;
