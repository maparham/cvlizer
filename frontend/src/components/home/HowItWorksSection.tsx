/**
 * How It Works section for the home page.
 * Horizontal scroll strip of three slides with screenshots, dot indicators,
 * and accessibility attributes.
 */
import React, { useRef, useState, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { HOME_SHOWCASE_STEPS } from "../../pages/homeShowcaseConfig";

const HowItWorksSection: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth } = el;
    const slideWidth = clientWidth;
    const index = Math.min(
      HOME_SHOWCASE_STEPS.length - 1,
      Math.round(scrollLeft / slideWidth)
    );
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      requestAnimationFrame(updateActiveFromScroll);
    }
  }, [updateActiveFromScroll]);

  const handleDotClick = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const slideWidth = el.clientWidth;
    el.scrollTo({
      left: index * slideWidth,
      behavior: "smooth",
    });
    setActiveIndex(index);
  };

  return (
    <Box
      component="section"
      role="region"
      aria-label="How CV Optimizer works"
      sx={{
        width: "100%",
        bgcolor: "grey.100",
        borderTop: 1,
        borderBottom: 1,
        borderColor: "divider",
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 5 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              letterSpacing: "-0.04em",
              mb: 1,
            }}
          >
            Your perfect CV in minutes
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 520, mx: "auto", lineHeight: 1.6 }}
          >
            Import, polish, tailor, and export your CV — all in one smooth AI-powered flow.
          </Typography>
        </Box>

        <Box
          sx={{
            mb: 4,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderRadius: 999,
              background:
                "linear-gradient(90deg, rgba(25,118,210,0.06), rgba(76,175,80,0.06))",
              display: "inline-flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              columnGap: 1.75,
              rowGap: 1,
            }}
          >
              {[
                { label: "Import PDF", Icon: CloudUploadIcon },
                { label: "AI proofread", Icon: AutoFixHighIcon },
                { label: "Job-tailored AI enhancement", Icon: WorkOutlineIcon },
                { label: "Export PDF", Icon: PictureAsPdfIcon },
              ].map(({ label, Icon }, index, arr) => (
                <React.Fragment key={label}>
                  <Box
                    sx={{
                      px: 1.75,
                      py: 0.75,
                      borderRadius: 999,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "grey.300",
                      boxShadow: 1,
                      whiteSpace: "nowrap",
                      transition:
                        "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      "&:hover": {
                        transform: "translateY(-1px)",
                        boxShadow: 3,
                        borderColor: "primary.main",
                      },
                    }}
                  >
                    <Icon sx={{ fontSize: 18, color: "primary.main" }} />
                    <Box
                      component="span"
                      sx={{ fontSize: 14, fontWeight: 500, color: "text.primary" }}
                    >
                      {label}
                    </Box>
                  </Box>
                  {index < arr.length - 1 && (
                    <Typography
                      component="span"
                      color="text.disabled"
                      sx={{
                        fontSize: 18,
                        mx: 0.25,
                        opacity: 0.7,
                        transition: "opacity 0.15s ease",
                      }}
                    >
                      →
                    </Typography>
                  )}
                </React.Fragment>
              ))}
            </Box>
          </Box>

        <Box sx={{ position: "relative" }}>
          <Box
            ref={scrollRef}
            onScroll={handleScroll}
            tabIndex={0}
            sx={{
              display: "flex",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              pb: 2,
              mx: -2,
              px: 2,
              "&::-webkit-scrollbar": {
                height: 8,
              },
              "&::-webkit-scrollbar-track": {
                bgcolor: "grey.200",
                borderRadius: 4,
              },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "grey.400",
                borderRadius: 4,
              },
              "&::-webkit-scrollbar-thumb:hover": {
                bgcolor: "grey.500",
              },
            }}
          >
            {HOME_SHOWCASE_STEPS.map((step, index) => (
              <Card
                key={index}
                sx={{
                  flex: "0 0 100%",
                  minWidth: 0,
                  scrollSnapAlign: "start",
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  minHeight: { xs: 360, md: 300 },
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: 2,
                  overflow: "hidden",
                  transition:
                    "box-shadow 0.2s ease, border-color 0.2s ease",
                  "&:hover": {
                    boxShadow: 6,
                    borderColor: "primary.light",
                  },
                }}
              >
                <Box
                  sx={{
                    flex: { xs: "0 0 auto", md: "0 0 32%" },
                    pt: 2,
                    px: 2,
                    pb: 2,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: { xs: "flex-start", md: "center" },
                    borderLeft: 3,
                    borderColor: "primary.main",
                    pl: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      letterSpacing: "-0.02em",
                      mb: 1,
                    }}
                  >
                    {step.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.65,
                      maxWidth: 420,
                    }}
                  >
                    {step.body}
                  </Typography>
                  {step.bullets && step.bullets.length > 0 && (
                    <Box sx={{ mt: 1.5, pt: 1.25, borderTop: 1, borderColor: "divider" }}>
                      {step.bullets.map((bullet, bulletIndex) => {
                        const colonIndex = bullet.indexOf(": ");
                        const label = colonIndex >= 0 ? bullet.slice(0, colonIndex) : null;
                        const rest = colonIndex >= 0 ? bullet.slice(colonIndex + 2) : bullet;
                        return (
                          <Box
                            key={bulletIndex}
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                              mb: 1,
                              "&:last-of-type": { mb: 0 },
                            }}
                          >
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                bgcolor: "primary.main",
                                mt: 1,
                                flexShrink: 0,
                              }}
                            />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ lineHeight: 1.6 }}
                              >
                                {label !== null ? (
                                  <>
                                    <Box
                                      component="span"
                                      sx={{
                                        fontWeight: 600,
                                        color: "primary.main",
                                      }}
                                    >
                                      {label}:
                                    </Box>{" "}
                                    {rest}
                                  </>
                                ) : (
                                  bullet
                                )}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                </Box>
                <Box
                  sx={{
                    flex: { xs: "1 1 auto", md: "1 1 68%" },
                    minHeight: 0,
                    bgcolor: "grey.200",
                    p: { xs: 2, md: 2.5 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: "auto",
                      maxHeight: { xs: 320, md: 360 },
                      borderRadius: 2,
                      boxShadow: 1,
                      overflow: "hidden",
                      bgcolor: "background.paper",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 2,
                    }}
                  >
                    <Box
                      component="img"
                      src={step.imagePath}
                      alt=""
                      sx={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
          <Box
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 24,
              width: 48,
              pointerEvents: "none",
              background:
                "linear-gradient(to left, rgba(240,240,240,0.95), transparent)",
            }}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 1.5,
            mt: 3,
          }}
        >
          {HOME_SHOWCASE_STEPS.map((_, index) => (
            <Box
              key={index}
              component="button"
              type="button"
              onClick={() => handleDotClick(index)}
              aria-label={`Go to step ${index + 1}`}
              aria-current={activeIndex === index ? "true" : undefined}
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: 0,
                p: 0,
                cursor: "pointer",
                bgcolor: activeIndex === index ? "primary.main" : "grey.400",
                opacity: activeIndex === index ? 1 : 0.7,
                transition: "opacity 0.2s ease",
                "&:hover": {
                  opacity: 1,
                },
              }}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default HowItWorksSection;
