import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Error component for missing Clerk key
const ClerkSetupError = () => (
  <div style={{ 
    padding: '40px', 
    textAlign: 'center', 
    fontFamily: 'Arial, sans-serif',
    maxWidth: '600px',
    margin: '100px auto',
    border: '2px solid #ff6b6b',
    borderRadius: '8px',
    backgroundColor: '#fff5f5'
  }}>
    <h2 style={{ color: '#d63031', marginBottom: '20px' }}>⚠️ Clerk Setup Required</h2>
    <p style={{ color: '#2d3436', marginBottom: '20px', lineHeight: '1.6' }}>
      To use this application, you need to set up Clerk authentication:
    </p>
    <ol style={{ textAlign: 'left', color: '#2d3436', lineHeight: '1.8' }}>
      <li>Go to <a href="https://clerk.com" target="_blank" rel="noopener noreferrer">clerk.com</a> and create a free account</li>
      <li>Create a new React application</li>
      <li>Copy your Publishable Key from the API Keys page</li>
      <li>Add it to <code style={{ backgroundColor: '#f8f9fa', padding: '2px 6px', borderRadius: '4px' }}>frontend/.env.local</code>:</li>
    </ol>
    <pre style={{ 
      backgroundColor: '#f8f9fa', 
      padding: '15px', 
      borderRadius: '4px', 
      textAlign: 'left',
      marginTop: '15px',
      border: '1px solid #e9ecef'
    }}>
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
    </pre>
    <p style={{ color: '#636e72', marginTop: '20px', fontSize: '14px' }}>
      Current key: <code>{PUBLISHABLE_KEY || 'undefined'}</code>
    </p>
  </div>
)

if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY === 'YOUR_PUBLISHABLE_KEY' || PUBLISHABLE_KEY === 'pk_test_') {
  ReactDOM.createRoot(document.getElementById('root')!).render(<ClerkSetupError />)
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </React.StrictMode>,
  )
}
