/**
 * Home Page Component
 *
 * Landing page for the CV Optimizer application. Explains the product in three
 * steps and offers primary actions (quick start, dashboard, sign-in) depending
 * on auth state. Sticky hero and "How it works" section with horizontal slides.
 *
 * Rendered at the root route ("/"). Uses Clerk (SignedIn, SignedOut, UserButton,
 * openSignIn). Responsive, Material-UI, single column top to bottom.
 */
import React from "react";
import { Container, Button, Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  UserButton,
  useClerk,
} from "@clerk/clerk-react";
import { HowItWorksSection } from "../components/home";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { openSignIn } = useClerk();

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
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.5,
                  bgcolor: "primary.main",
                }}
              />
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                }}
              >
                CV Optimizer
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
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.06em",
                  mb: 0.5,
                }}
              >
                Your personal CV coach
              </Typography>
              <Typography
                variant="subtitle1"
                component="p"
                sx={{
                  fontWeight: 600,
                  color: "primary.main",
                  mb: 2.5,
                  letterSpacing: "-0.035em",
                }}
              >
                Practical advice, focused edits, fast results.
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3, maxWidth: 460, lineHeight: 1.6 }}
              >
                Import your existing CV, polish every section with AI, and export
                a job-tailored version that hiring managers and ATS systems
                actually read.
              </Typography>
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
                  component="img"
                  src="/home-showcase/hero-cv-example.png"
                  alt="Example CV preview in Rahkar"
                  sx={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    borderRadius: 3,
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <HowItWorksSection />
    </Box>
  );
};

export default Home;
