/**
 * Marketing homepage layout for `/home`: hero CTAs plus How it works and Why Rahkar.
 */
import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import HowItWorksSection from "../../components/home/HowItWorksSection";
import ComparisonSection from "../../components/home/ComparisonSection";
import { getMarketingHomeContent } from "./variantConfigs";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const content = getMarketingHomeContent();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/quick-start");
    }
  };

  const handleSecondaryCta = () => {
    if (content.secondaryCta === "See how it works") {
      document
        .getElementById("how-it-works")
        ?.scrollIntoView({ behavior: "smooth" });
    } else if (content.secondaryCta === "Why Rahkar?") {
      document
        .getElementById("why-rahkar")
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      handleGetStarted();
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        component="section"
        sx={{
          width: "100%",
          bgcolor:
            content.heroTone === "softTint"
              ? "rgba(129, 199, 132, 0.05)"
              : "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          pt: { xs: 8, md: 12 },
          pb: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              textAlign: "center",
              maxWidth: 800,
              mx: "auto",
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "2rem", sm: "2.75rem", md: "3.25rem" },
                lineHeight: 1.2,
                letterSpacing: "-0.04em",
                mb: 3,
                color: "text.primary",
              }}
            >
              {content.headline}
            </Typography>

            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "1rem", sm: "1.125rem" },
                lineHeight: 1.6,
                color: "text.secondary",
                mb: 4,
                fontWeight: 400,
              }}
            >
              {content.subheadline}
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "center",
                flexWrap: "wrap",
                mb: content.trustChips ? 3 : 0,
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={handleGetStarted}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: 2,
                  boxShadow: 3,
                  "&:hover": {
                    boxShadow: 6,
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                {content.primaryCta}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={handleSecondaryCta}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: 2,
                  borderWidth: 2,
                  "&:hover": {
                    borderWidth: 2,
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                {content.secondaryCta}
              </Button>
            </Box>

            {content.trustChips && (
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {content.trustChips.map((chip, index) => (
                  <Chip
                    key={index}
                    label={chip}
                    size="medium"
                    sx={{
                      bgcolor: "background.paper",
                      border: 1,
                      borderColor: "divider",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                    }}
                  />
                ))}
              </Box>
            )}

            {content.heroFeatureMode === "bullets" && content.heroBullets && (
              <Box
                sx={{
                  mt: 6,
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(3, 1fr)",
                  },
                  gap: 3,
                  textAlign: "left",
                }}
              >
                {content.heroBullets.map((bullet, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 3,
                      bgcolor: "background.paper",
                      borderRadius: 2,
                      border: 1,
                      borderColor: "divider",
                      "&:hover": {
                        boxShadow: 3,
                        transform: "translateY(-2px)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 1,
                        color: "primary.main",
                      }}
                    >
                      {bullet.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {bullet.description}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {content.comparisonSectionFirst ? (
        <>
          <ComparisonSection />
          <HowItWorksSection />
        </>
      ) : (
        <>
          <HowItWorksSection />
          <ComparisonSection />
        </>
      )}

      <Box
        component="section"
        sx={{
          width: "100%",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          py: 8,
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 2,
              }}
            >
              Ready to improve your resume?
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 4,
                opacity: 0.9,
              }}
            >
              Start your free trial today. No credit card required.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                px: 5,
                py: 1.75,
                fontSize: "1.125rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
                bgcolor: "background.paper",
                color: "primary.main",
                "&:hover": {
                  bgcolor: "background.paper",
                  transform: "translateY(-2px)",
                  boxShadow: 6,
                },
                transition: "all 0.2s ease",
              }}
            >
              Get started free
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};
