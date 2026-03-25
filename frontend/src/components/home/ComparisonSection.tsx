/**
 * Comparison section for the home page.
 * "Why Rahkar?" — card grid comparing Rahkar to others.
 */
import React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
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
    others: "Often require manual data entry.",
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

const ComparisonSection: React.FC = () => {
  return (
    <Box
      component="section"
      id="why-rahkar"
      role="region"
      aria-label="Why Rahkar comparison"
      sx={{
        width: "100%",
        bgcolor: "grey.50",
        borderTop: 1,
        borderBottom: 1,
        borderColor: "divider",
        py: 8,
      }}
    >
      <Container maxWidth="lg">
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
                  Others: {row.others}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default ComparisonSection;
