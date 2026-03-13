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
import { Container, Button, Box } from "@mui/material";
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
    px: 4,
    py: 1.5,
    borderRadius: 3,
    boxShadow: 3,
    "&:hover": {
      boxShadow: 6,
      transform: "translateY(-1px)",
    },
    transition: "all 0.2s ease-in-out",
  };

  const outlinedButtonSx = {
    fontWeight: 600,
    textTransform: "none" as const,
    px: 4,
    py: 1.5,
    borderRadius: 3,
    borderWidth: 2,
    "&:hover": {
      borderWidth: 2,
      bgcolor: "action.hover",
    },
    transition: "all 0.2s ease-in-out",
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
          py: 2,
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              display: "flex",
              gap: 3,
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <SignedIn>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/quick-start")}
                sx={primaryButtonSx}
              >
                Quick Start
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate("/dashboard")}
                sx={outlinedButtonSx}
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
            </SignedIn>
            <SignedOut>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/quick-start")}
                sx={primaryButtonSx}
              >
                Try It Now
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => openSignIn()}
                sx={outlinedButtonSx}
              >
                Log In / Sign Up
              </Button>
            </SignedOut>
          </Box>
        </Container>
      </Box>

      <HowItWorksSection />
    </Box>
  );
};

export default Home;
