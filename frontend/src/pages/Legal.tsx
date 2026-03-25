/**
 * Legal Page – Privacy Policy and Terms of Service
 *
 * Combined public page for GDPR-oriented disclosure and terms.
 * Content is placeholder/skeleton; replace with final copy before production.
 */
import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";

const Legal: React.FC = () => {
  return (
    <Box sx={{ py: 4, bgcolor: "grey.50", minHeight: "100vh" }}>
      <Container maxWidth="md">
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 4 }}>
          Legal
        </Typography>

        {/* Privacy Policy */}
        <Typography id="privacy" variant="h5" component="h2" sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
          Privacy Policy
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          What we collect
        </Typography>
        <Typography variant="body1" paragraph>
          We collect account information (e.g. email, name) via our authentication provider; the CVs and job
          descriptions you upload or create; and usage data such as activity logs necessary to operate the service.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Why we process your data
        </Typography>
        <Typography variant="body1" paragraph>
          We process your data to provide the CV optimization service (contract) and to improve the service
          (legitimate interest).
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Retention
        </Typography>
        <Typography variant="body1" paragraph>
          We keep your data while your account is active. Some data is subject to automated cleanup and retention
          policies (e.g. session and audit data). Replace with your final retention wording.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Cookies and local storage
        </Typography>
        <Typography variant="body1" paragraph>
          We use essential cookies (e.g. for sign-in via our authentication provider) and browser storage
          (localStorage and sessionStorage) for app functionality such as your selected job description and UI
          state. We do not use advertising or third-party tracking cookies. No consent is required for this
          essential use.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Third parties
        </Typography>
        <Typography variant="body1" paragraph>
          We use Clerk for authentication and OpenAI for CV and job-description processing. Data may be
          processed by these providers in accordance with their respective privacy policies.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Your rights
        </Typography>
        <Typography variant="body1" paragraph>
          You can delete your account and all associated data at any time from your Profile under Account
          Management (Delete account). This permanently removes your account and data from our systems.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Contact
        </Typography>
        <Typography variant="body1" paragraph>
          For privacy-related requests or questions, please contact us at [your contact email or contact form].
        </Typography>

        {/* Terms of Service */}
        <Typography id="terms" variant="h5" component="h2" sx={{ fontWeight: 600, mt: 6, mb: 2 }}>
          Terms of Service
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Acceptance
        </Typography>
        <Typography variant="body1" paragraph>
          By using Resume Coach (Rahkar) you agree to these terms. If you do not agree, do not use the service.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Description of service
        </Typography>
        <Typography variant="body1" paragraph>
          Resume Coach (Rahkar) provides AI-assisted CV and resume editing, job-description integration, and export tools. We may
          change or discontinue features with reasonable notice.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Acceptable use
        </Typography>
        <Typography variant="body1" paragraph>
          You must use the service lawfully and not misuse it to harm others or violate any applicable laws or
          third-party rights.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Account responsibility
        </Typography>
        <Typography variant="body1" paragraph>
          You are responsible for keeping your account credentials secure and for all activity under your
          account.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Disclaimer of warranty
        </Typography>
        <Typography variant="body1" paragraph>
          The service is provided &quot;as is&quot;. We do not guarantee uninterrupted or error-free operation or
          specific outcomes (e.g. job offers).
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Limitation of liability
        </Typography>
        <Typography variant="body1" paragraph>
          To the extent permitted by law, our liability is limited to the amount you paid for the service in the
          twelve months before the claim, or to the maximum permitted by applicable law. Replace with your
          chosen jurisdiction and limits.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Termination
        </Typography>
        <Typography variant="body1" paragraph>
          You may close your account at any time from Profile. We may suspend or terminate access for breach of
          these terms. Account deletion is permanent; we do not retain your data after deletion.
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Changes to these terms
        </Typography>
        <Typography variant="body1" paragraph>
          We may update these terms. We will notify you of material changes (e.g. by email or in-app notice).
          Continued use after changes constitutes acceptance.
        </Typography>

        <Box sx={{ mt: 6, pt: 2 }}>
          <Link component={RouterLink} to="/" sx={{ fontWeight: 500 }}>
            Back to home
          </Link>
        </Box>
      </Container>
    </Box>
  );
};

export default Legal;
