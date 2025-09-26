/**
 * Application Entry Point - React Bootstrap and Authentication Setup
 * 
 * This module serves as the main entry point for the CV Lator React application.
 * It handles application initialization, authentication provider setup, and error
 * handling for missing environment configuration.
 * 
 * Key responsibilities:
 * - Bootstrap React application with StrictMode for development
 * - Initialize Clerk authentication provider with publishable key
 * - Handle missing environment configuration gracefully
 * - Provide user-friendly error UI for configuration issues
 * - Mount the main App component to the DOM
 * 
 * Usage context:
 * - This module is loaded by Vite as the application entry point
 * - Environment variables are loaded from .env files
 * - Authentication is required for all application functionality
 * - Graceful degradation when configuration is missing
 * 
 * Dependencies:
 * - Clerk React for authentication management
 * - React DOM for application mounting
 * - Environment variables for configuration
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ClerkProvider } from "@clerk/clerk-react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Error component for missing publishable key
const MissingKeyError = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5'
  }}>
    <div style={{
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      maxWidth: '500px',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#d32f2f', marginBottom: '1rem' }}>Configuration Error</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Missing Clerk Publishable Key. Please check your environment configuration.
      </p>
      <p style={{ color: '#888', fontSize: '0.9rem' }}>
        Set VITE_CLERK_PUBLISHABLE_KEY in your .env file
      </p>
    </div>
  </div>
);

// Log missing key for diagnostics but don't throw
if (!PUBLISHABLE_KEY) {
  console.error("Missing Clerk Publishable Key - VITE_CLERK_PUBLISHABLE_KEY not set");
}

// Ensure your index.html contains a <div id="root"></div> element for React to mount the app.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    ) : (
      <MissingKeyError />
    )}
  </StrictMode>
);
