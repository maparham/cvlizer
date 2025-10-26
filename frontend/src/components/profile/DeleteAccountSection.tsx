import React from "react";
import { Paper, Typography, Box } from "@mui/material";
import { DeleteAccountButton } from "../common/DeleteAccountButton";

export const DeleteAccountSection: React.FC = () => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        borderRadius: 3,
        border: "2px solid",
        borderColor: "error.main",
        background: "linear-gradient(145deg, #fff5f5 0%, #ffffff 100%)",
      }}
    >
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          sx={{ fontWeight: "bold", color: "error.main" }}
        >
          Delete Account
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 600, mx: "auto" }}
        >
          Once you delete your account, there is no going back. This action
          permanently removes all your data including CVs, job descriptions,
          and AI-generated content.
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <DeleteAccountButton variant="contained" size="large" />
      </Box>
    </Paper>
  );
};
