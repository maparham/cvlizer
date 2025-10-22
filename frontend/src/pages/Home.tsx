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
          py: 8,
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom>
            Optimize Your CV with AI
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            Upload, edit, and enhance your CV with AI-powered insights tailored
            to any job description
          </Typography>
          <SignedIn>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/quick-start")}
                sx={{
                  bgcolor: "white",
                  color: "primary.main",
                  "&:hover": { bgcolor: "grey.100" },
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
                  "&:hover": {
                    borderColor: "grey.300",
                    bgcolor: "rgba(255,255,255,0.1)",
                  },
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
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <button
                onClick={() => navigate("/quick-start")}
                style={{
                  backgroundColor: "white",
                  color: "#1976d2",
                  border: "none",
                  borderRadius: "4px",
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Try It Now
              </button>
              <SignUpButton mode="modal">
                <button
                  style={{
                    backgroundColor: "transparent",
                    color: "white",
                    border: "1px solid white",
                    borderRadius: "4px",
                    padding: "12px 24px",
                    fontSize: "16px",
                    fontWeight: "500",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Get Started
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button
                  style={{
                    backgroundColor: "transparent",
                    color: "white",
                    border: "1px solid white",
                    borderRadius: "4px",
                    padding: "12px 24px",
                    fontSize: "16px",
                    fontWeight: "500",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Sign In
                </button>
              </SignInButton>
            </Box>
          </SignedOut>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          How It Works
        </Typography>
        <Typography
          variant="h6"
          textAlign="center"
          color="text.secondary"
          sx={{ mb: 6 }}
        >
          Transform your CV in three simple steps
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: "100%", textAlign: "center" }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h1" sx={{ mb: 2 }}>
                    {feature.icon}
                  </Typography>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ bgcolor: "grey.50", py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to optimize your CV?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Join thousands of job seekers who have improved their chances with
            AI-enhanced CVs
          </Typography>
          <SignedOut>
            <SignUpButton mode="modal">
              <button
                style={{
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Start Free Today
              </button>
            </SignUpButton>
          </SignedOut>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
