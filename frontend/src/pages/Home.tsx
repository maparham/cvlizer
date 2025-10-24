/**
 * Home Page Component
 *
 * This module provides the landing page for the CV Optimizer application.
 * It showcases the main features and provides authentication options for users.
 *
 * Key responsibilities:
 * - Display application hero section with call-to-action
 * - Showcase main features (upload, edit, AI enhancement)
 * - Provide authentication buttons for signed-in and signed-out users
 * - Handle navigation to dashboard and profile pages
 *
 * Usage:
 * - Rendered as the root route ("/") in the application
 * - Uses Clerk authentication components for user state management
 * - Provides responsive design with Material-UI components
 */
import React from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Upload & Parse",
      description:
        "Upload your CV in PDF, DOC, or DOCX format and get it automatically parsed into structured data.",
      icon: "📄",
    },
    {
      title: "Smart Editing",
      description:
        "Edit your CV with an intuitive interface that lets you modify text and reorder sections easily.",
      icon: "✏️",
    },
    {
      title: "AI Enhancement",
      description:
        "Get AI-generated sections tailored to specific job descriptions to make your CV stand out.",
      icon: "🤖",
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          py: 10,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
            zIndex: 1,
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 2 }}>
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.025em",
              mb: 3,
              textShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            Optimize Your CV with AI
          </Typography>
          <Typography
            variant="h5"
            sx={{
              mb: 6,
              opacity: 0.95,
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: 600,
              mx: "auto"
            }}
          >
            Upload, edit, and enhance your CV with AI-powered insights tailored
            to any job description
          </Typography>
          <SignedIn>
            <Box sx={{ display: "flex", gap: 3, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/quick-start")}
                sx={{
                  bgcolor: "white",
                  color: "primary.main",
                  fontWeight: 600,
                  textTransform: "none",
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  boxShadow: 3,
                  "&:hover": {
                    bgcolor: "grey.100",
                    boxShadow: 6,
                    transform: "translateY(-1px)"
                  },
                  transition: "all 0.2s ease-in-out"
                }}
              >
                Quick Start
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate("/dashboard")}
                sx={{
                  borderColor: "white",
                  color: "white",
                  fontWeight: 600,
                  textTransform: "none",
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  borderWidth: 2,
                  "&:hover": {
                    borderColor: "white",
                    bgcolor: "rgba(255,255,255,0.15)",
                    transform: "translateY(-1px)"
                  },
                  transition: "all 0.2s ease-in-out"
                }}
              >
                Go to Dashboard
              </Button>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: {
                      width: "48px",
                      height: "48px",
                    },
                  },
                }}
              />
            </Box>
          </SignedIn>
          <SignedOut>
            <Box sx={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/quick-start")}
                sx={{
                  bgcolor: "white",
                  color: "primary.main",
                  fontWeight: 600,
                  textTransform: "none",
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  boxShadow: 3,
                  "&:hover": {
                    bgcolor: "grey.100",
                    boxShadow: 6,
                    transform: "translateY(-1px)"
                  },
                  transition: "all 0.2s ease-in-out"
                }}
              >
                Try It Now
              </Button>
              <SignUpButton mode="modal">
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: "white",
                    color: "white",
                    fontWeight: 600,
                    textTransform: "none",
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    borderWidth: 2,
                    "&:hover": {
                      borderColor: "white",
                      bgcolor: "rgba(255,255,255,0.15)",
                      transform: "translateY(-1px)"
                    },
                    transition: "all 0.2s ease-in-out"
                  }}
                >
                  Get Started
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: "white",
                    color: "white",
                    fontWeight: 600,
                    textTransform: "none",
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    borderWidth: 2,
                    "&:hover": {
                      borderColor: "white",
                      bgcolor: "rgba(255,255,255,0.15)",
                      transform: "translateY(-1px)"
                    },
                    transition: "all 0.2s ease-in-out"
                  }}
                >
                  Sign In
                </Button>
              </SignInButton>
            </Box>
          </SignedOut>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography
          variant="h3"
          component="h2"
          textAlign="center"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: "text.primary",
            letterSpacing: "-0.025em",
            mb: 2
          }}
        >
          How It Works
        </Typography>
        <Typography
          variant="h6"
          textAlign="center"
          color="text.secondary"
          sx={{
            mb: 8,
            fontWeight: 400,
            maxWidth: 600,
            mx: "auto"
          }}
        >
          Transform your CV in three simple steps
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: "100%",
                  textAlign: "center",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: 2,
                  transition: "all 0.3s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 6,
                    borderColor: "primary.light"
                  }
                }}
              >
                <CardContent sx={{ p: 5 }}>
                  <Typography
                    variant="h1"
                    sx={{
                      mb: 3,
                      fontSize: "4rem",
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                    }}
                  >
                    {feature.icon}
                  </Typography>
                  <Typography
                    variant="h5"
                    component="h3"
                    gutterBottom
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      letterSpacing: "-0.025em",
                      mb: 2
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.6,
                      fontSize: "1.1rem"
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: "grey.50",
          py: 10,
          borderTop: "1px solid",
          borderColor: "divider"
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: "text.primary",
              letterSpacing: "-0.025em",
              mb: 3
            }}
          >
            Ready to optimize your CV?
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              mb: 6,
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: 500,
              mx: "auto"
            }}
          >
            Join thousands of job seekers who have improved their chances with
            AI-enhanced CVs
          </Typography>
          <SignedOut>
            <SignUpButton mode="modal">
              <Button
                variant="contained"
                size="large"
                sx={{
                  fontWeight: 600,
                  textTransform: "none",
                  px: 5,
                  py: 2,
                  borderRadius: 3,
                  boxShadow: 3,
                  "&:hover": {
                    boxShadow: 6,
                    transform: "translateY(-1px)"
                  },
                  transition: "all 0.2s ease-in-out"
                }}
              >
                Start Free Today
              </Button>
            </SignUpButton>
          </SignedOut>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
