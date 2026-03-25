import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { SignUp } from "@clerk/clerk-react";

const Register: React.FC = () => {
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: "100%" }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography component="h1" variant="h4">
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Get started with CV optimization today.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <SignUp
              routing="path"
              path="/register"
              signInUrl="/login"
              redirectUrl="/login-redirect"
            />
          </Box>

          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2">
              Already have an account?{" "}
              <Link component={RouterLink} to="/login">
                Sign in here
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
