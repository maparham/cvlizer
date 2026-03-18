/**
 * Comparison section for the home page.
 * "Why Rahkar?" — multiple visual variants (table, cards A/B, two-column, typography, combo).
 */
import React from "react";
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";

export const COMPARISON_ROWS: Array<{
  feature: string;
  rahkar: string;
  others: string;
  icon: React.ReactNode;
}> = [
  {
    feature: "Import and clean your existing CV",
    rahkar:
      "We parse and clean your existing CV.",
    others: "Often built around filling a blank template.",
    icon: <DescriptionOutlinedIcon />,
  },
  {
    feature: "Job-driven tailoring",
    rahkar:
      "We tailor your resume to each job individually.",
    others: "Generic AI writing not personalized to your CV.",
    icon: <WorkOutlineOutlinedIcon />,
  },
  {
    feature: "Control over AI edits",
    rahkar: "You see and approve every AI suggestion.",
    others: "Single \"optimize\" with little visibility or control.",
    icon: <TouchAppOutlinedIcon />,
  },
  {
    feature: "Quality coaching",
    rahkar:
      "We focus on wording and impact.",
    others: "ATS score and keyword focus; less on readability and story.",
    icon: <AutoAwesomeOutlinedIcon />,
  },
];

export type ComparisonVariant =
  | "table"
  | "cardsA"
  | "cardsB"
  | "twocol"
  | "typography"
  | "combo";

interface ComparisonSectionProps {
  /** Visual variant. Default "table". */
  variant?: ComparisonVariant;
  /** Optional label shown above the section (e.g. when stacking variants). */
  variantLabel?: string;
}

const SECTION_HEADING = (
  <Box sx={{ textAlign: "center", mb: 5 }}>
    <Typography
      variant="h5"
      component="h2"
      sx={{
        fontWeight: 700,
        color: "text.primary",
        letterSpacing: "-0.04em",
        mb: 1,
      }}
    >
      Why Rahkar?
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
      Built for control and clarity.
    </Typography>
  </Box>
);

export const COMPARISON_VARIANTS: ComparisonVariant[] = [
  "table",
  "cardsA",
  "cardsB",
  "twocol",
  "typography",
  "combo",
];

const ComparisonSection: React.FC<ComparisonSectionProps> = ({
  variant = "table",
  variantLabel,
}) => {
  const sectionSx = {
    width: "100%",
    bgcolor: "grey.50",
    borderTop: 1,
    borderBottom: 1,
    borderColor: "divider",
    py: 8,
  };

  const labelBlock = variantLabel ? (
    <Box sx={{ textAlign: "center", mb: 2 }}>
      <Typography variant="overline" color="text.secondary" fontWeight={600}>
        {variantLabel}
      </Typography>
    </Box>
  ) : null;

  if (variant === "table") {
    return (
      <Box
        component="section"
        id={`why-rahkar-${variant}`}
        role="region"
        aria-label="Why Rahkar comparison"
        sx={sectionSx}
      >
        <Container maxWidth="lg">
          {labelBlock}
          {SECTION_HEADING}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              overflowX: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Table aria-label="Rahkar vs other resume builders">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.100" }}>
                  <TableCell
                    component="th"
                    scope="col"
                    sx={{ fontWeight: 700, minWidth: 140 }}
                  >
                    Feature
                  </TableCell>
                  <TableCell
                    component="th"
                    scope="col"
                    sx={{ fontWeight: 700, minWidth: 200 }}
                  >
                    Rahkar
                  </TableCell>
                  <TableCell
                    component="th"
                    scope="col"
                    sx={{ fontWeight: 700, minWidth: 200 }}
                  >
                    Many other resume builders
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {COMPARISON_ROWS.map((row) => (
                  <TableRow key={row.feature} hover>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{ fontWeight: 600 }}
                    >
                      {row.feature}
                    </TableCell>
                    <TableCell>{row.rahkar}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {row.others}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>
    );
  }

  if (variant === "cardsA") {
    return (
      <Box
        component="section"
        id={`why-rahkar-${variant}`}
        role="region"
        aria-label="Why Rahkar comparison"
        sx={sectionSx}
      >
        <Container maxWidth="lg">
          {labelBlock}
          {SECTION_HEADING}
          <Stack spacing={2}>
            {COMPARISON_ROWS.map((row) => (
              <Card
                key={row.feature}
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 2 }}>
                  <Box
                    sx={{
                      color: "primary.main",
                      mt: 0.25,
                      "& .MuiSvgIcon-root": { fontSize: 24 },
                    }}
                  >
                    {row.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {row.feature}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "primary.main", fontWeight: 500, mb: 0.5 }}
                    >
                      Rahkar: {row.rahkar}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Others: {row.others}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>
    );
  }

  if (variant === "cardsB") {
    return (
      <Box
        component="section"
        id={`why-rahkar-${variant}`}
        role="region"
        aria-label="Why Rahkar comparison"
        sx={sectionSx}
      >
        <Container maxWidth="lg">
          {labelBlock}
          {SECTION_HEADING}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
              },
              gap: 3,
            }}
          >
            {COMPARISON_ROWS.map((row) => (
              <Card
                key={row.feature}
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <CardContent sx={{ py: 3, px: 2.5 }}>
                  <Box
                    sx={{
                      color: "primary.main",
                      mb: 1.5,
                      "& .MuiSvgIcon-root": { fontSize: 36 },
                    }}
                  >
                    {row.icon}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {row.feature}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "primary.main", fontWeight: 600, mb: 1 }}
                  >
                    {row.rahkar}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {row.others}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>
    );
  }

  if (variant === "twocol") {
    return (
      <Box
        component="section"
        id={`why-rahkar-${variant}`}
        role="region"
        aria-label="Why Rahkar comparison"
        sx={sectionSx}
      >
        <Container maxWidth="lg">
          {labelBlock}
          {SECTION_HEADING}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
              "& > *": { p: 2.5 },
            }}
          >
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Rahkar
              </Typography>
              <Stack spacing={2}>
                {COMPARISON_ROWS.map((row) => (
                  <Box key={row.feature}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      {row.feature}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.95 }}>
                      {row.rahkar}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            <Box sx={{ bgcolor: "grey.100" }}>
              <Typography variant="h6" fontWeight={700} color="text.secondary" gutterBottom>
                Many other resume builders
              </Typography>
              <Stack spacing={2}>
                {COMPARISON_ROWS.map((row) => (
                  <Box key={row.feature}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.secondary" gutterBottom>
                      {row.feature}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.others}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>
    );
  }

  if (variant === "typography") {
    return (
      <Box
        component="section"
        id={`why-rahkar-${variant}`}
        role="region"
        aria-label="Why Rahkar comparison"
        sx={sectionSx}
      >
        <Container maxWidth="md">
          {labelBlock}
          {SECTION_HEADING}
          <Stack spacing={4}>
            {COMPARISON_ROWS.map((row) => (
              <Box key={row.feature}>
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    mb: 1,
                  }}
                >
                  {row.feature}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    fontSize: "1.0625rem",
                    mb: 0.5,
                  }}
                >
                  {row.rahkar}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Others: {row.others}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>
    );
  }

  if (variant === "combo") {
    return (
      <Box
        component="section"
        id={`why-rahkar-${variant}`}
        role="region"
        aria-label="Why Rahkar comparison"
        sx={{
          ...sectionSx,
          background:
            "linear-gradient(180deg, rgba(25,118,210,0.04) 0%, transparent 50%)",
        }}
      >
        <Container maxWidth="lg">
          {labelBlock}
          {SECTION_HEADING}
          <Stack spacing={2}>
            {COMPARISON_ROWS.map((row) => (
              <Card
                key={row.feature}
                elevation={0}
                sx={{
                  border: "2px solid",
                  borderColor: "primary.light",
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  overflow: "hidden",
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    py: 2.5,
                    px: 3,
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      borderRadius: 2,
                      p: 1,
                      "& .MuiSvgIcon-root": { fontSize: 28 },
                    }}
                  >
                    {row.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      {row.feature}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "primary.dark",
                        fontWeight: 600,
                        mb: 0.75,
                      }}
                    >
                      {row.rahkar}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.others}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>
    );
  }

  return null;
};

export default ComparisonSection;
