# CV Lator Frontend Specification

## Overview

The CV Lator frontend is a React 18 application built with TypeScript and Material-UI that provides an intuitive interface for CV management, editing, and AI-powered optimization. It features a modern, responsive design with comprehensive state management and real-time collaboration capabilities.

## Architecture

### Technology Stack
- **Framework**: React 18.2.0 with TypeScript 5.2.2
- **Build Tool**: Vite 5.0.8
- **UI Library**: Material-UI (MUI) 5.15.0
- **State Management**: React Context + Zustand 4.4.7 (hybrid approach)
- **Routing**: React Router DOM 6.20.1
- **Authentication**: Clerk React 5.48.1
- **Drag & Drop**: @dnd-kit/core, @hello-pangea/dnd
- **HTTP Client**: Axios 1.6.2
- **Testing**: Jest 29.7.0, Playwright 1.55.0
- **Styling**: Emotion (CSS-in-JS)

### Project Structure
```
frontend/
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── common/           # Common/shared components
│   │   ├── cv/               # CV-specific components
│   │   └── forms/            # Form components
│   ├── contexts/             # React contexts
│   │   ├── AuthContext.tsx   # Authentication context
│   │   ├── CVEditorContext.tsx # CV editing context
│   │   └── ImpersonationContext.tsx # Admin impersonation
│   ├── hooks/                # Custom React hooks
│   ├── pages/                # Page components
│   │   ├── Home.tsx          # Landing page
│   │   ├── Login.tsx         # Login page
│   │   ├── Register.tsx      # Registration page
│   │   ├── Dashboard.tsx     # CV management dashboard
│   │   ├── CVEditor.tsx      # CV editing interface
│   │   ├── Profile.tsx       # User profile page
│   │   └── AdminDashboard.tsx # Admin interface
│   ├── services/             # API services
│   │   ├── api.ts            # Main API client
│   │   ├── authService.ts    # Authentication service
│   │   ├── cvService.ts      # CV management service
│   │   ├── jobDescriptionService.ts # Job description service
│   │   ├── aiService.ts      # AI features service
│   │   ├── historyService.ts # CV history service
│   │   └── adminService.ts   # Admin functionality service
│   ├── stores/               # Zustand stores
│   │   ├── cvStore.ts        # CV state management
│   │   ├── uiStore.ts        # UI state management
│   │   └── authStore.ts      # Authentication state
│   ├── types/                # TypeScript type definitions
│   │   ├── cv.ts             # CV-related types
│   │   ├── user.ts           # User-related types
│   │   ├── api.ts            # API response types
│   │   └── common.ts         # Common types
│   ├── utils/                # Utility functions
│   │   ├── fileValidation.ts # File validation utilities
│   │   ├── validationUtils.ts # Form validation utilities
│   │   └── dateUtils.ts      # Date manipulation utilities
│   ├── styles/               # Global styles
│   │   └── global.ts         # Global CSS styles
│   ├── App.tsx               # Main application component
│   └── main.tsx              # Application entry point
├── tests/                    # Test files
│   ├── e2e/                  # End-to-end tests
│   └── __tests__/            # Unit tests
├── public/                   # Static assets
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
└── jest.config.mjs           # Jest testing configuration
```

## Core Components

### Application Structure

#### App Component
- **File**: `src/App.tsx`
- **Purpose**: Main application wrapper with routing and providers
- **Features**:
  - React Router setup with lazy loading
  - Material-UI theme provider
  - Authentication context provider
  - Impersonation context for admin features
  - Global loading states and error boundaries
  - Route protection and navigation

#### Main Entry Point
- **File**: `src/main.tsx`
- **Purpose**: Application bootstrap and Clerk initialization
- **Features**:
  - React StrictMode for development
  - Clerk authentication provider setup
  - Environment configuration validation
  - Error handling for missing configuration

### Page Components

#### Home Page
- **File**: `src/pages/Home.tsx`
- **Route**: `/`
- **Purpose**: Landing page with feature showcase
- **Features**:
  - Hero section with call-to-action
  - Feature highlights (upload, edit, AI enhancement)
  - Authentication buttons for different user states
  - Responsive design with Material-UI Grid

#### Login Page
- **File**: `src/pages/Login.tsx`
- **Route**: `/login`
- **Purpose**: User authentication interface
- **Features**:
  - Clerk SignIn component integration
  - Clean, centered layout
  - Navigation to registration
  - Redirect handling after login

#### Register Page
- **File**: `src/pages/Register.tsx`
- **Route**: `/register`
- **Purpose**: User registration interface
- **Features**:
  - Clerk SignUp component integration
  - Consistent styling with login page
  - Email verification handling

#### Dashboard Page
- **File**: `src/pages/Dashboard.tsx`
- **Route**: `/dashboard`
- **Purpose**: CV management interface
- **Features**:
  - CV collection display with cards
  - Search and filtering capabilities
  - CRUD operations (create, edit, delete, duplicate)
  - Status indicators for processing states
  - Admin access controls
  - Responsive grid layout

#### CV Editor Page
- **File**: `src/pages/CVEditor.tsx`
- **Route**: `/cv/:cvId` and `/cv/new`
- **Purpose**: Main CV editing interface
- **Features**:
  - Section-based CV editing
  - Real-time preview and validation
  - Auto-save functionality
  - Export and delete operations
  - Unsaved changes warning
  - Navigation with edit state checks

#### Profile Page
- **File**: `src/pages/Profile.tsx`
- **Route**: `/profile`
- **Purpose**: User profile management
- **Features**:
  - User information display and editing
  - Account settings
  - Activity history
  - Preferences management

#### Admin Dashboard
- **File**: `src/pages/AdminDashboard.tsx`
- **Route**: `/admin`
- **Purpose**: Administrative interface
- **Features**:
  - User management and statistics
  - System monitoring
  - Impersonation capabilities
  - Audit logs and reports

### Core Components

#### CV Upload Component
- **File**: `src/components/cv/CVUpload.tsx`
- **Purpose**: File upload interface with drag-and-drop
- **Features**:
  - Drag and drop functionality with visual feedback
  - File type validation (PDF, DOC, DOCX)
  - File size validation (10MB limit)
  - Upload progress tracking
  - Error handling and user feedback
  - File preview before upload

#### CV Editor Components
- **File**: `src/components/cv/PDFCVEditor.tsx`
- **Purpose**: Main CV editing interface
- **Features**:
  - Section-based editing (personal info, experience, education, skills)
  - Drag-and-drop reordering
  - Inline editing with validation
  - Real-time preview
  - Auto-save functionality

#### Job Description Management
- **File**: `src/components/cv/JobDescriptionManager.tsx`
- **Purpose**: Job description input and management
- **Features**:
  - Text input for job descriptions
  - URL-based job posting extraction
  - Multiple job descriptions per CV
  - AI-powered matching suggestions

#### AI Section Generator
- **File**: `src/components/cv/AISectionGenerator.tsx`
- **Purpose**: AI-powered content generation
- **Features**:
  - "Why I'm a Good Fit" section generation
  - Job description analysis
  - Content suggestions and optimization
  - Real-time generation with progress indicators

## State Management

### React Context System (Primary)

#### AuthContext (`src/contexts/AuthContext.tsx`)
- **Purpose**: Authentication state and methods
- **Provides**:
  - User authentication status via Clerk
  - Login/logout methods (redirects to Clerk)
  - User profile information
  - Admin status checking
- **Integration**: Uses Clerk React hooks (`useUser`, `useClerk`)

#### CVEditorContext (`src/contexts/CVEditorContext.tsx`)
- **Purpose**: CV editing state management
- **Provides**:
  - CV data and editing state
  - Section editing methods
  - Validation state
  - Save functionality
  - Drag and drop state management
  - Unsaved changes tracking

#### ImpersonationContext (`src/contexts/ImpersonationContext.tsx`)
- **Purpose**: Admin impersonation functionality
- **Provides**:
  - Impersonation state
  - Start/stop impersonation methods
  - User switching capabilities
  - Impersonation session management

### Zustand Stores (Secondary)

#### CV Store (`src/stores/cvStore.ts`)
- **Purpose**: CV data persistence and API integration
- **State**:
  - `cvs`: Array of user's CVs
  - `currentCV`: Currently selected CV
  - `loading`: Loading states
  - `error`: Error states
- **Actions**:
  - `fetchCVs()`: Load user's CVs
  - `fetchCV(id)`: Load specific CV
  - `createCV(data)`: Create new CV
  - `updateCV(id, data)`: Update existing CV
  - `deleteCV(id)`: Delete CV
  - `uploadCV(file)`: Upload CV file

#### UI Store (`src/stores/uiStore.ts`)
- **Purpose**: Global UI state and notifications
- **State**:
  - `notifications`: Array of notification objects
  - `loading`: Global loading states
  - `modals`: Modal state management
- **Actions**:
  - `showNotification()`: Display notifications
  - `removeNotification()`: Remove notifications
  - `showError()`: Show error notifications
  - `showSuccess()`: Show success notifications

## Component Architecture

### CV Editor Components

#### PDFCVEditor (`src/components/cv/PDFCVEditor.tsx`)
- **Purpose**: Main CV editing interface with PDF-like layout
- **Features**:
  - Section management sidebar
  - PDF-style content area
  - Drag and drop functionality
  - Unsaved changes detection
  - Integration with CV editor context

#### Section Management
- **SectionManagerSidebar**: Section reordering and visibility controls
- **CVContentArea**: PDF-style content rendering
- **Individual CV Sections**: Modular section components for different CV parts

## Services

### API Service (`src/services/api.ts`)
- **Purpose**: Centralized API client configuration
- **Features**:
  - Axios instance with base configuration
  - Request/response interceptors
  - Error handling
  - Authentication token management

### CV Service (`src/services/cvService.ts`)
- **Purpose**: CV-related API operations
- **Methods**:
  - `getCVs()`: Fetch user's CVs
  - `getCV(id)`: Fetch specific CV
  - `createCV(data)`: Create new CV
  - `updateCV(id, data)`: Update CV
  - `deleteCV(id)`: Delete CV
  - `uploadCV(file)`: Upload CV file
  - `exportCV(id)`: Export CV as PDF

### AI Service (`src/services/aiService.ts`)
- **Purpose**: AI-powered features
- **Methods**:
  - `generateSection(cvId, jobDescription)`: Generate AI section
  - `getAISections(cvId)`: Get AI-generated sections
  - `deleteAISection(sectionId)`: Delete AI section

### Job Description Service (`src/services/jobDescriptionService.ts`)
- **Purpose**: Job description management
- **Methods**:
  - `createJobDescription(cvId, data)`: Create job description
  - `getJobDescriptions(cvId)`: Get job descriptions
  - `deleteJobDescription(id)`: Delete job description

## Type Definitions

### CV Types (`src/types/cv.ts`)
```typescript
interface CVData {
  personal_info: PersonalInfo
  experience: Experience[]
  education: Education[]
  skills: Skills
  projects: Project[]
  certifications: Certification[]
  languages: Language[]
  references: Reference[]
}

interface PersonalInfo {
  full_name: string
  email: string
  phone: string
  location: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
}

interface Experience {
  id: string
  company: string
  position: string
  start_date: string
  end_date?: string
  current: boolean
  description: string
  achievements: string[]
  skills: string[]
}
```

### User Types (`src/types/user.ts`)
```typescript
interface User {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  created_at: string
  last_login_at?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  loading: boolean
}
```

### API Types (`src/types/api.ts`)
```typescript
interface ApiResponse<T> {
  data: T
  message?: string
  status: number
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
```

## Routing

### Route Configuration
- **Home**: `/` - Landing page
- **Authentication**: `/login`, `/register` - Auth pages
- **Dashboard**: `/dashboard` - CV management
- **CV Editor**: `/cv/:cvId` - Edit existing CV
- **New CV**: `/cv/new` - Create new CV
- **Profile**: `/profile` - User profile
- **Admin**: `/admin` - Admin dashboard

### Route Protection
- **Public Routes**: Home, Login, Register
- **Protected Routes**: Dashboard, CV Editor, Profile
- **Admin Routes**: Admin Dashboard
- **Route Guards**: Authentication and authorization checks

## Styling and Theming

### Material-UI Theme
- **Primary Color**: #1976d2 (Blue)
- **Secondary Color**: #dc004e (Red)
- **Mode**: Light theme
- **Typography**: Roboto font family
- **Spacing**: 8px base unit

### Component Styling
- **CSS-in-JS**: Emotion for component styling
- **Responsive Design**: Mobile-first approach
- **Consistent Spacing**: Material-UI spacing system
- **Color Palette**: Consistent color usage

## Testing

### Test Configuration
- **Unit Tests**: Jest with React Testing Library
- **E2E Tests**: Playwright for browser testing
- **Coverage**: 50% coverage thresholds (configurable)
- **Test Environment**: jsdom for unit tests

### Test Categories
- **Component Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Full user workflow testing
- **API Tests**: Service layer testing

## Build and Deployment

### Development
- **Dev Server**: Vite dev server with HMR
- **Port**: 5173 (default)
- **Hot Reload**: Automatic reload on changes
- **Source Maps**: Full source map support

### Production Build
- **Build Tool**: Vite production build
- **Optimization**: Code splitting and tree shaking
- **Assets**: Optimized static assets
- **Bundle Analysis**: Bundle size optimization

### Environment Configuration
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_ADMIN_EMAIL=admin@example.com
```

## Performance Optimizations

### Code Splitting
- **Lazy Loading**: Page components loaded on demand
- **Route-based Splitting**: Separate bundles per route
- **Dynamic Imports**: Heavy components loaded asynchronously

### State Management
- **Zustand**: Lightweight state management
- **Selective Updates**: Only update affected components
- **Memoization**: React.memo for expensive components

### Bundle Optimization
- **Tree Shaking**: Remove unused code
- **Minification**: Compress JavaScript and CSS
- **Asset Optimization**: Optimize images and fonts

## Error Handling

### Error Boundaries
- **Component Level**: Individual component error boundaries
- **Page Level**: Page-level error handling
- **Global Level**: Application-wide error boundary

### Error Types
- **Network Errors**: API request failures
- **Validation Errors**: Form validation failures
- **Authentication Errors**: Auth-related issues
- **File Upload Errors**: Upload process failures

### User Feedback
- **Toast Notifications**: Success/error messages
- **Loading States**: Progress indicators
- **Error Messages**: Clear error descriptions
- **Retry Mechanisms**: Automatic retry for transient errors

## Accessibility

### ARIA Support
- **Semantic HTML**: Proper HTML structure
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling

### Material-UI Accessibility
- **Built-in ARIA**: MUI components include ARIA attributes
- **Color Contrast**: WCAG compliant color schemes
- **Screen Reader Support**: Full screen reader compatibility

This specification provides a comprehensive overview of the CV Lator frontend architecture, enabling complete regeneration of the React application with all its features, components, and functionality.
