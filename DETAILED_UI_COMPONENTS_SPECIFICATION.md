# CV Lator - Detailed UI/UX Components Specification

## Overview

This document provides an exhaustive, fine-grained specification of every UI component, interaction pattern, and visual element in the CV Lator frontend application. Each component is documented with its complete behavior, styling, states, interactions, and implementation details.

## Table of Contents

1. [Core Application Structure](#core-application-structure)
2. [Page Components](#page-components)
3. [CV Management Components](#cv-management-components)
4. [CV Editor Components](#cv-editor-components)
5. [Form Components](#form-components)
6. [UI Utility Components](#ui-utility-components)
7. [Admin Components](#admin-components)
8. [Common/Shared Components](#commonshared-components)
9. [Component Interaction Patterns](#component-interaction-patterns)
10. [Visual Design System](#visual-design-system)

---

## Core Application Structure

### App Component (`src/App.tsx`)

**Purpose**: Main application wrapper with routing, theming, and global state management.

**Structure**:
- **Container**: Full viewport height with flex layout
- **Theme Provider**: Material-UI theme with custom color palette
- **Router**: React Router with lazy loading and route protection
- **Context Providers**: AuthContext, ImpersonationContext, and CVEditorContext
- **Global Loading**: Suspense fallback with centered circular progress
- **Clerk Integration**: ClerkProvider for authentication management

**Key Features**:
- Lazy loading for all page components
- Route protection with ProtectedRoute wrapper
- Global error boundaries
- Impersonation banner integration
- Activity logging on route changes
- Clerk authentication integration

**Visual Elements**:
- **Loading Spinner**: Centered CircularProgress with 100vh min-height
- **Theme Colors**: Primary blue (#1976d2), Secondary red (#dc004e)
- **Layout**: Full viewport with overflow hidden

### Main Entry Point (`src/main.tsx`)

**Purpose**: Application bootstrap and Clerk authentication setup.

**Structure**:
- **React StrictMode**: Development mode error checking
- **Clerk Provider**: Authentication context with publishable key
- **Error Handling**: Graceful degradation for missing configuration
- **Environment Validation**: Checks for required environment variables
- **App Component**: Main application component mounting

**Key Features**:
- Environment variable validation
- Clerk authentication initialization
- Error boundary for configuration issues
- Development vs production mode handling
- Clerk publishable key configuration

---

## Page Components

### Home Page (`src/pages/Home.tsx`)

**Purpose**: Landing page with feature showcase and authentication options.

**Layout Structure**:
- **Hero Section**: Full-width gradient background with centered content
- **Features Grid**: 3-column responsive grid showcasing main features
- **Call-to-Action**: Prominent buttons for authenticated and unauthenticated users

**Visual Elements**:

#### Hero Section
- **Background**: Linear gradient from #667eea to #764ba2
- **Height**: Minimum 400px with vertical padding
- **Content**: Centered with max-width container
- **Typography**: 
  - H1: 32px, bold, white color
  - H5: 20px, 90% opacity, white color
- **Buttons**: 
  - Primary: White background with blue text
  - Secondary: Transparent with white border

#### Features Section
- **Layout**: 3-column grid on desktop, single column on mobile
- **Cards**: White background with subtle shadow
- **Icons**: 48px emoji icons
- **Typography**: H4 titles with body descriptions
- **Spacing**: 24px between cards

**Interactive Elements**:
- **Navigation Buttons**: Navigate to dashboard or profile
- **Authentication Buttons**: Clerk SignIn/SignUp components
- **Hover Effects**: Subtle elevation increase on cards

### Login Page (`src/pages/Login.tsx`)

**Purpose**: User authentication interface with Clerk integration.

**Layout Structure**:
- **Container**: Centered with max-width small
- **Paper**: Elevated card with padding
- **Form**: Clerk SignIn component
- **Links**: Navigation to registration

**Visual Elements**:
- **Container**: 8px top margin, centered layout
- **Paper**: 3px elevation, 4px padding, full width
- **Typography**: H4 title, body2 subtitle
- **Form**: Centered Clerk SignIn component
- **Links**: RouterLink to registration page

**Interactive Elements**:
- **SignIn Component**: Clerk-managed authentication
- **Navigation Links**: Styled as Material-UI links
- **Form Validation**: Handled by Clerk

### Register Page (`src/pages/Register.tsx`)

**Purpose**: User registration interface with Clerk integration.

**Layout Structure**:
- **Container**: Centered with max-width small
- **Paper**: Elevated card with padding
- **Form**: Clerk SignUp component
- **Links**: Navigation to login

**Visual Elements**:
- **Container**: 8px top margin, centered layout
- **Paper**: 3px elevation, 4px padding, full width
- **Typography**: H4 title, body2 subtitle
- **Form**: Centered Clerk SignUp component
- **Links**: RouterLink to login page

### Dashboard Page (`src/pages/Dashboard.tsx`)

**Purpose**: CV management interface with search, filtering, and CRUD operations.

**Layout Structure**:
- **App Bar**: Fixed header with search and actions
- **Content**: Scrollable container with CV grid
- **Floating Action Button**: Upload CV button

**Visual Elements**:

#### App Bar
- **Height**: 64px with 16px horizontal padding
- **Background**: White with subtle shadow
- **Search**: Full-width search bar with icon
- **Actions**: User menu and upload button
- **Typography**: H6 title with user count

#### CV Grid
- **Layout**: Responsive grid (1-4 columns based on screen size)
- **Card Size**: 300px width, auto height
- **Spacing**: 16px between cards
- **Cards**: White background with hover effects

#### CV Cards
- **Header**: CV title with status indicator
- **Body**: Preview thumbnail or placeholder
- **Footer**: Action buttons (edit, delete, duplicate)
- **Status Chips**: Color-coded status indicators
- **Hover**: Slight elevation increase

**Interactive Elements**:
- **Search Bar**: Real-time filtering with debounce
- **CV Cards**: Click to edit, hover for actions
- **Action Buttons**: Edit, delete, duplicate, export
- **Upload Button**: Opens upload modal
- **User Menu**: Profile and logout options

**State Management**:
- **Loading States**: Skeleton loading for cards
- **Error States**: Error messages with retry options
- **Empty States**: Encouraging message with upload button

### CV Editor Page (`src/pages/CVEditor.tsx`)

**Purpose**: Main CV editing interface with section-based editing.

**Layout Structure**:
- **Header**: App bar with navigation and actions
- **Main Content**: Two-column layout (sidebar + editor)
- **Sidebar**: Section management and controls
- **Editor**: PDF-style content area

**Visual Elements**:

#### Header
- **App Bar**: Light gray background (#f5f5f5)
- **Height**: 48px for compact design
- **Navigation**: Back button with breadcrumb
- **Actions**: AI Tools shortcut button (before Export), Export, delete, user menu
- **Typography**: Body2 breadcrumb text
- **AI Tools Button**: AutoAwesome icon, secondary style, only visible for saved CVs

#### Main Layout
- **Container**: Full viewport height with flex layout
- **Sidebar**: 350px width with scrollable content
- **Editor**: Flexible width with PDF-style paper
- **Responsive**: Stacked on mobile devices

**Interactive Elements**:
- **Back Navigation**: With unsaved changes warning
- **Section Management**: Drag-and-drop reordering
- **Inline Editing**: Click to edit, auto-save
- **Export**: PDF generation with progress
- **Delete**: Confirmation dialog

**State Management**:
- **Editing States**: Section and individual item editing
- **Validation**: Real-time validation with error display
- **Auto-save**: Automatic saving with user feedback
- **Unsaved Changes**: Warning dialogs and state tracking

### Profile Page (`src/pages/Profile.tsx`)

**Purpose**: User profile management and account settings.

**Layout Structure**:
- **Container**: Centered with max-width medium
- **Sections**: Profile info, settings, activity
- **Forms**: Editable profile information

**Visual Elements**:
- **Container**: Centered layout with padding
- **Sections**: Card-based layout with spacing
- **Forms**: Material-UI form components
- **Typography**: Consistent heading hierarchy

**Interactive Elements**:
- **Form Editing**: Inline editing with save/cancel
- **Settings Toggle**: Various preference toggles
- **Activity History**: Scrollable activity feed

### Admin Dashboard (`src/pages/AdminDashboard.tsx`)

**Purpose**: Administrative interface for user and system management.

**Layout Structure**:
- **Tabs**: User management, system stats, audit logs
- **Data Tables**: Sortable and filterable data
- **Action Buttons**: Impersonation, user management

**Visual Elements**:
- **Tabs**: Material-UI tab component
- **Tables**: DataGrid with sorting and filtering
- **Cards**: Statistics and metrics display
- **Charts**: Data visualization components

**Interactive Elements**:
- **User Actions**: Impersonate, edit, delete users
- **Data Filtering**: Search and filter capabilities
- **Bulk Actions**: Multi-select operations
- **Export**: Data export functionality

---

## CV Management Components

### CV Upload Component (`src/components/cv/CVUpload.tsx`)

**Purpose**: Drag-and-drop file upload interface with validation and preview.

**Layout Structure**:
- **Dialog**: Modal with title, content, and actions
- **Drop Zone**: Large drag-and-drop area
- **File Preview**: Card showing selected file details
- **Progress**: Linear progress bar during upload

**Visual Elements**:

#### Dialog
- **Size**: Max-width small, full width
- **Title**: "Upload CV" with close button
- **Content**: Padding with file handling area
- **Actions**: Cancel/Close button

#### Drop Zone
- **Size**: 400px x 200px minimum
- **Border**: 2px dashed #e0e0e0
- **Background**: White with hover state
- **Text**: "Drag and drop your CV here" with file type info
- **Icon**: Upload icon (48px) above text
- **Hover State**: Border changes to primary blue
- **Active State**: Border becomes solid primary blue

#### File Preview
- **Size**: 200px x 200px
- **Background**: Light gray with file icon
- **Content**: File name, size, type
- **Actions**: Remove button in top-right corner
- **Animation**: Fade-in transition

#### Progress Indicator
- **Type**: Linear progress bar
- **Color**: Primary blue
- **Height**: 4px
- **Animation**: Smooth progress animation
- **Text**: Percentage and status text

**Interactive Elements**:
- **Drag & Drop**: Visual feedback on drag events
- **File Selection**: Click to open file picker
- **File Validation**: Real-time validation with error messages
- **Upload Progress**: Animated progress bar
- **Success State**: Checkmark with success message

**State Management**:
- **Drag State**: Visual feedback for drag operations
- **File State**: Selected file with validation
- **Upload State**: Progress and status tracking
- **Error State**: Error messages and retry options

### File Preview Component (`src/components/cv/FilePreview.tsx`)

**Purpose**: Visual file preview card with metadata and validation status.

**Layout Structure**:
- **Card**: Elevated card with content and actions
- **Header**: File icon, name, and remove button
- **Body**: File details and validation status
- **Actions**: Remove and upload buttons

**Visual Elements**:

#### Card
- **Size**: Max-width 400px, centered
- **Border**: Color-coded based on validation status
- **Background**: White with subtle shadow
- **Border Radius**: 8px

#### Header
- **Icon**: File type icon (48px) with color coding
- **Title**: File name with word break
- **Remove Button**: Close icon in top-right corner

#### File Details
- **Type Chip**: File type with outlined style
- **Size**: Formatted file size
- **Validation**: Success/error icon with message
- **Metadata**: Last modified date

#### Actions
- **Remove Button**: Outlined style
- **Upload Button**: Contained style, disabled when invalid

**Interactive Elements**:
- **Remove**: Clears selected file
- **Upload**: Initiates upload process
- **Hover Effects**: Subtle elevation changes

**State Management**:
- **Validation**: Real-time validation feedback
- **File Info**: Display file metadata
- **Error States**: Clear error messaging

### Editable Title Component (`src/components/cv/EditableTitle.tsx`)

**Purpose**: Inline editable title with save/cancel functionality.

**Layout Structure**:
- **Display Mode**: Title with edit icon on hover
- **Edit Mode**: Text field with action buttons
- **Actions**: Save, cancel, and loading states

**Visual Elements**:

#### Display Mode
- **Typography**: Configurable variant (h4, h5, h6)
- **Hover Effect**: Edit icon appears on hover
- **Cursor**: Pointer cursor when editable
- **Disabled State**: Reduced opacity when disabled

#### Edit Mode
- **Input**: Full-width text field
- **Typography**: Matches display variant
- **Actions**: Save (check) and cancel (close) buttons
- **Loading**: Circular progress indicator

**Interactive Elements**:
- **Click to Edit**: Single click to enter edit mode
- **Keyboard Shortcuts**: Enter to save, Escape to cancel
- **Auto-focus**: Input focused and selected on edit
- **Validation**: Required field validation

**State Management**:
- **Edit State**: Toggle between display and edit modes
- **Value State**: Current and editing values
- **Loading State**: Save operation in progress
- **Validation**: Required field and length validation

---

## CV Editor Components

### PDF CV Editor (`src/components/cv/PDFCVEditor.tsx`)

**Purpose**: Main CV editing interface with PDF-like layout and section management.

**Layout Structure**:
- **Container**: Full viewport height with flex layout
- **SectionManagerSidebar**: Section management panel with drag-and-drop
- **CVContentArea**: PDF-style CV content rendering
- **PDFCVEditorDialogs**: Various editing dialogs
- **ConnectedHistoryPanel**: Version history sidebar with diff viewer

**Visual Elements**:

#### Container
- **Layout**: Flex row with full height
- **Overflow**: Hidden to prevent scrollbars
- **Background**: Light gray (#f5f5f5)
- **LocalizationProvider**: Date picker localization

#### Sidebar (SectionManagerSidebar)
- **Width**: 350px fixed width
- **Background**: White with right border
- **Padding**: 16px internal spacing
- **Scroll**: Vertical scroll when content overflows
- **Editable Title**: Inline CV title editing

#### Content Area (CVContentArea)
- **Flex**: Flexible width to fill remaining space
- **Background**: Light gray with centered paper
- **Paper**: A4 dimensions (210mm x 297mm)
- **Shadow**: Subtle drop shadow for depth

**Interactive Elements**:
- **Section Management**: Drag-and-drop reordering with @dnd-kit
- **Section Toggle**: Show/hide sections
- **Add Sections**: Add new CV sections
- **Title Editing**: Inline title editing
- **History**: Version history management with diff viewer
- **Unsaved Changes**: Warning dialogs and state tracking

### Section Manager Sidebar (`src/components/cv/core/SectionManagerSidebar.tsx`)

**Purpose**: Sidebar interface for managing CV sections with drag-and-drop reordering.

**Layout Structure**:
- **Title Section**: Editable CV title at top
- **Instructions**: Help text for drag-and-drop
- **Visible Sections**: Sortable list of active sections
- **Hidden Sections**: Collapsed sections with restore option
- **Available Sections**: Sections that can be added

**Visual Elements**:

#### Title Section
- **Editable Title**: Inline editable with hover effects
- **Typography**: H6 variant with custom styling
- **Color**: Dark gray (#333) with medium weight

#### Instructions
- **Text**: "Drag sections to reorder them"
- **Typography**: Body2 with italic style
- **Color**: Medium gray (#666)

#### Section Lists
- **Visible Sections**: Drag-and-drop sortable list
- **Hidden Sections**: Grayed out with restore buttons
- **Available Sections**: Add buttons for new sections

**Interactive Elements**:
- **Drag & Drop**: Reorder sections with visual feedback
- **Toggle Visibility**: Show/hide sections
- **Add Sections**: Add new sections to CV
- **Restore Sections**: Restore hidden sections

**State Management**:
- **Section Order**: Drag-and-drop state management
- **Visibility**: Show/hide section states
- **Available Sections**: Dynamic list of addable sections

### CV Content Area (`src/components/cv/core/CVContentArea.tsx`)

**Purpose**: Renders the main PDF-style CV content with dynamic section rendering.

**Layout Structure**:
- **Container**: Scrollable container with background
- **Paper**: A4-sized paper with content
- **Sections**: Dynamically rendered CV sections

**Visual Elements**:

#### Container
- **Background**: Light gray (#f5f5f5)
- **Padding**: 16px around paper
- **Overflow**: Auto for scrolling

#### Paper
- **Dimensions**: 210mm width, 297mm min-height
- **Background**: White
- **Shadow**: 0 4px 8px rgba(0,0,0,0.1)
- **Padding**: 16px internal spacing
- **Position**: Relative for absolute positioning

#### Sections
- **Spacing**: 12px between sections
- **Order**: Based on section order and visibility
- **Rendering**: Dynamic based on section type

**Interactive Elements**:
- **Section Editing**: Click to edit sections
- **Individual Item Editing**: Edit specific items within sections
- **Auto-save**: Automatic saving of changes
- **Validation**: Real-time validation feedback

### Sortable Section Item (`src/components/cv/core/SortableSectionItem.tsx`)

**Purpose**: Individual sortable item in the section manager sidebar.

**Layout Structure**:
- **List Item**: Material-UI ListItem with drag handle
- **Icon**: Drag indicator on left
- **Content**: Section title and status
- **Actions**: Visibility toggle and error indicators

**Visual Elements**:

#### List Item
- **Border**: 1px solid #e0e0e0
- **Border Radius**: 4px
- **Background**: White or gray based on visibility
- **Margin**: 4px bottom spacing
- **Padding**: 8px internal spacing

#### Drag Handle
- **Icon**: DragIndicator with grab cursor
- **Color**: Gray (#666) with blue hover
- **Size**: Small icon size
- **Tooltip**: "Drag to reorder sections"

#### Content
- **Title**: Section name with ellipsis overflow
- **Typography**: Body2 with medium weight
- **Color**: Red if has errors, normal otherwise

#### Actions
- **Error Badge**: Warning icon with error count
- **Visibility Toggle**: Eye icon for show/hide
- **Colors**: Primary for visible, default for hidden

**Interactive Elements**:
- **Drag & Drop**: Sortable with visual feedback
- **Hover Effects**: Elevation and transform changes
- **Click Actions**: Toggle visibility
- **Tooltips**: Helpful action descriptions

**State Management**:
- **Drag State**: Visual feedback during drag
- **Error State**: Error count and visual indicators
- **Visibility State**: Show/hide toggle state

---

## Form Components

### CV Section Components

**Available CV Sections**:
- **PersonalInfoSection**: Contact details and social links
- **WorkExperienceSection**: Professional experience entries
- **EducationSection**: Educational background
- **SkillsSection**: Technical and soft skills
- **ProjectsSection**: Personal and professional projects
- **CertificationsSection**: Professional certifications
- **AwardsSection**: Awards and recognition
- **PublicationsSection**: Research and publications
- **VolunteerExperienceSection**: Volunteer work
- **ProfessionalSummarySection**: Professional summary

**Common Section Features**:
- **Inline Editing**: Click to edit functionality
- **Drag & Drop**: Reordering capabilities with @dnd-kit
- **Validation**: Real-time form validation
- **Auto-save**: Automatic saving with user feedback
- **Empty States**: Encouraging messages when no data exists
- **Error Handling**: Clear error messages and retry options

### Personal Info Section (`src/components/cv/sections/PersonalInfoSection.tsx`)

**Purpose**: Personal information section with contact details and social links.

**Layout Structure**:
- **Name Field**: Large, prominent name input
- **Contact Fields**: Email, phone, location in row
- **Social Fields**: LinkedIn, GitHub, website in row
- **Validation**: Required field validation

**Visual Elements**:

#### Name Field
- **Typography**: 2rem font size, bold weight
- **Color**: Primary blue (#1976d2)
- **Validation**: Required field with error state
- **Placeholder**: "Your Name *"

#### Contact Fields
- **Layout**: Flex row with wrap
- **Icons**: Emoji icons for each field
- **Validation**: Required fields with error messages
- **Spacing**: 16px gap between fields

#### Social Fields
- **Layout**: Flex row with wrap
- **Icons**: Material-UI icons for each platform
- **Links**: Clickable links in display mode
- **Spacing**: 16px gap between fields

**Interactive Elements**:
- **Inline Editing**: Click to edit fields
- **Keyboard Shortcuts**: Enter to save, Escape to cancel
- **Link Handling**: External links open in new tab
- **Validation**: Real-time validation feedback

**State Management**:
- **Form Data**: Local form state
- **Validation**: Required field validation
- **Auto-save**: Automatic saving with feedback

### Work Experience Section (`src/components/cv/sections/WorkExperienceSection.tsx`)

**Purpose**: Work experience section with multiple entries and individual editing.

**Layout Structure**:
- **Section Header**: Title with add button and sort controls
- **Experience Items**: List of work experience entries
- **Edit Forms**: Individual experience editing forms
- **Empty State**: Message when no experience exists

**Visual Elements**:

#### Section Header
- **Title**: "Work Experience" with typography
- **Add Button**: Plus icon for adding new entries
- **Sort Menu**: Dropdown for sorting options
- **Tooltips**: Helpful action descriptions

#### Experience Items
- **Position**: Bold subtitle with company
- **Company**: Blue color with location
- **Dates**: Start and end dates
- **Description**: Job description text
- **Actions**: Edit and delete buttons

#### Edit Forms
- **Position**: Autocomplete with job suggestions
- **Company**: Text input with validation
- **Location**: Location autocomplete
- **Dates**: Date picker components
- **Description**: Multiline text area

**Interactive Elements**:
- **Add Experience**: Click to add new entry
- **Edit Experience**: Click to edit individual entry
- **Delete Experience**: Remove with confirmation
- **Reorder Experience**: Drag-and-drop or arrows
- **Sort Experience**: Sort by date fields

**State Management**:
- **Experience Data**: Array of experience entries
- **Edit State**: Individual entry editing
- **Sort State**: Current sort configuration
- **Validation**: Form validation for each entry

---

## UI Utility Components

### Location Autocomplete (`src/components/cv/ui/LocationAutocomplete.tsx`)

**Purpose**: Autocomplete input for location selection with comprehensive location database.

**Layout Structure**:
- **Input Field**: Text field with autocomplete
- **Dropdown**: Filtered location suggestions
- **Keyboard Navigation**: Arrow keys and enter/escape

**Visual Elements**:

#### Input Field
- **Variant**: Standard Material-UI input
- **Placeholder**: "e.g., San Francisco, CA"
- **Icons**: None (clean appearance)
- **Validation**: Error state with helper text

#### Dropdown
- **Max Height**: 300px with scroll
- **Background**: White with shadow
- **Border**: 1px solid #e0e0e0
- **Items**: List items with hover effects

**Interactive Elements**:
- **Type to Search**: Filter locations as you type
- **Click to Select**: Click suggestion to select
- **Keyboard Navigation**: Arrow keys and enter
- **Escape to Close**: Close dropdown with escape

**State Management**:
- **Input Value**: Current input text
- **Filtered Options**: Filtered location list
- **Open State**: Dropdown visibility
- **Selection**: Selected location value

### Skills Autocomplete (`src/components/cv/ui/SkillsAutocomplete.tsx`)

**Purpose**: Autocomplete input for skills selection with predefined skill categories.

**Layout Structure**:
- **Input Field**: Text field with search icon
- **Suggestions**: Dropdown with skill suggestions
- **Categories**: Popular skills by category
- **Add Button**: Plus button to add skills

**Visual Elements**:

#### Input Field
- **Search Icon**: Magnifying glass icon
- **Clear Button**: X icon to clear input
- **Placeholder**: Dynamic based on skill type
- **Validation**: Error state for duplicates

#### Suggestions
- **Categories**: Popular skills by type
- **Search Results**: Filtered skill suggestions
- **Chips**: Clickable skill chips
- **Colors**: Different colors for skill types

**Interactive Elements**:
- **Type to Search**: Filter skills as you type
- **Click to Add**: Click suggestion to add
- **Category Browse**: Browse popular skills
- **Keyboard Shortcuts**: Enter to add, escape to close

**State Management**:
- **Input Value**: Current input text
- **Suggestions**: Filtered skill suggestions
- **Categories**: Popular skills by type
- **Existing Skills**: Already added skills

---

## Common/Shared Components

### Error Boundary (`src/components/common/ErrorBoundary.tsx`)

**Purpose**: Catches JavaScript errors and displays fallback UI.

**Layout Structure**:
- **Error Alert**: Prominent error message
- **Action Buttons**: Retry, reload, copy error info
- **Technical Details**: Expandable error information
- **Error ID**: Unique identifier for tracking

**Visual Elements**:

#### Error Alert
- **Severity**: Error with warning icon
- **Title**: "Something went wrong"
- **Message**: User-friendly error description
- **Actions**: Multiple action buttons

#### Action Buttons
- **Try Again**: Reset error boundary
- **Reload Page**: Full page reload
- **Copy Error Info**: Copy technical details
- **Icons**: Appropriate icons for each action

#### Technical Details
- **Accordion**: Expandable section
- **Error Message**: Raw error message
- **Stack Trace**: Error stack trace
- **Component Stack**: React component stack

**Interactive Elements**:
- **Retry**: Reset error boundary state
- **Reload**: Full page reload
- **Copy**: Copy error details to clipboard
- **Expand**: Show/hide technical details

**State Management**:
- **Error State**: Has error flag
- **Error Info**: Error details and stack
- **Error ID**: Unique identifier
- **Retry State**: Retry operation state

### Impersonation Banner (`src/components/common/ImpersonationBanner.tsx`)

**Purpose**: Prominent banner when admin is impersonating a user.

**Layout Structure**:
- **Alert**: Sticky alert at top of page
- **User Info**: Target user email and details
- **Timer**: Countdown timer with warnings
- **Actions**: End impersonation button

**Visual Elements**:

#### Alert
- **Position**: Sticky at top of page
- **Z-index**: Above app bar
- **Severity**: Info or warning based on time
- **Icon**: Person icon
- **Background**: Alert background color

#### User Info
- **Email**: Target user email in bold
- **Icon**: Person icon
- **Typography**: Body2 with bold email

#### Timer
- **Time Display**: Formatted remaining time
- **Icon**: Clock icon
- **Color**: Warning color when expiring
- **Accessibility**: ARIA live region

#### Actions
- **End Button**: Stop impersonation button
- **Loading**: Circular progress when ending
- **Keyboard Shortcut**: Ctrl+Shift+E

**Interactive Elements**:
- **End Impersonation**: Click to end session
- **Keyboard Shortcut**: Ctrl+Shift+E to end
- **Timer Updates**: Real-time countdown
- **Error Handling**: Error messages for failures

**State Management**:
- **Impersonation State**: Active/inactive status
- **Timer State**: Remaining time
- **Loading State**: End operation in progress
- **Error State**: Error messages

### History Panel (`src/components/cv/HistoryPanel.tsx`)

**Purpose**: Sidebar panel for CV version history management with diff viewer using react-diff-viewer-continued.

**Layout Structure**:
- **Drawer**: Right-side sliding drawer with resizable width
- **Header**: "Your CV's Evolution" title with history icon and close button
- **History List**: Chronological list grouped by date
- **Diff Viewer**: Side-by-side JSON comparison with syntax highlighting
- **Actions**: Create manual snapshot, restore version, delete version, compare versions

**Visual Elements**:

#### Drawer
- **Width**: 400px fixed width
- **Position**: Right side of screen
- **Background**: White with border
- **Scroll**: Vertical scroll for long lists
- **Handle**: Drag handle for resizing

#### Header
- **Title**: "Your CV's Evolution" with icon
- **Close Button**: X icon to close drawer
- **Icon**: History icon

#### History List
- **Grouped by Date**: Entries grouped by date
- **Version Numbers**: Sequential version numbers
- **Timestamps**: Relative time display
- **Status Chips**: Current, original, etc.

#### Diff Viewer
- **Side-by-Side**: Before and after comparison
- **Syntax Highlighting**: JSON diff highlighting
- **Collapsible Sections**: Expandable diff sections
- **Navigation**: Jump to changes

**Interactive Elements**:
- **Create Snapshot**: Dialog to create new version
- **Restore Version**: Confirmation dialog
- **Delete Version**: Confirmation dialog
- **Compare Versions**: Show diff viewer with react-diff-viewer
- **Keyboard Navigation**: Arrow keys and enter
- **Resize Handle**: Drag to resize panel

**State Management**:
- **History Data**: List of version entries
- **Dialog States**: Various dialog visibility
- **Loading States**: Operation progress
- **Error States**: Error messages
- **Diff State**: Current comparison data

---

## Component Interaction Patterns

### Drag and Drop Patterns

#### Section Reordering
- **Library**: @dnd-kit/core with @dnd-kit/sortable
- **Visual Feedback**: Opacity change and elevation
- **Drop Zones**: Clear drop indicators
- **Keyboard Support**: Arrow key navigation
- **Accessibility**: ARIA labels and roles

#### Item Reordering
- **Library**: @hello-pangea/dnd
- **Visual Feedback**: Transform and shadow effects
- **Drag Handle**: Clear drag indicator
- **Drop Animation**: Smooth drop transitions
- **Constraints**: Disabled during editing

### Form Interaction Patterns

#### Inline Editing
- **Trigger**: Click to edit
- **Keyboard**: Enter to save, Escape to cancel
- **Auto-focus**: Input focused and selected
- **Validation**: Real-time validation feedback
- **Auto-save**: Automatic saving with debounce

#### Modal Editing
- **Trigger**: Edit button or click
- **Modal**: Full-screen or dialog modal
- **Actions**: Save, cancel, and close buttons
- **Validation**: Form-level validation
- **Loading**: Progress indicators during save

### State Management Patterns

#### Local State
- **Form Data**: Local form state management
- **Edit States**: Toggle between edit and display
- **Validation**: Real-time validation state
- **Loading**: Operation progress states

#### Global State
- **CV Data**: Centralized CV data management
- **User State**: Authentication and user info
- **UI State**: Notifications and modals
- **Editing State**: Global editing state tracking

### Error Handling Patterns

#### Validation Errors
- **Real-time**: Immediate feedback on input
- **Field-level**: Individual field validation
- **Form-level**: Overall form validation
- **Visual Indicators**: Error colors and icons

#### Network Errors
- **Retry Logic**: Automatic retry with backoff
- **User Feedback**: Clear error messages
- **Fallback UI**: Graceful degradation
- **Error Boundaries**: Catch and display errors

---

## Visual Design System

### Color Palette

#### Primary Colors
- **Primary Blue**: #1976d2 (buttons, links, primary actions)
- **Primary Blue Dark**: #1565c0 (hover states)
- **Primary Blue Light**: #42a5f5 (light backgrounds)

#### Secondary Colors
- **Secondary Red**: #dc004e (errors, delete actions)
- **Secondary Red Dark**: #c2185b (hover states)
- **Secondary Red Light**: #f8bbd9 (light error backgrounds)

#### Neutral Colors
- **Background**: #ffffff (main background)
- **Surface**: #f5f5f5 (cards, surfaces)
- **Border**: #e0e0e0 (borders, dividers)
- **Text Primary**: #333333 (main text)
- **Text Secondary**: #666666 (secondary text)
- **Text Disabled**: #999999 (disabled text)

#### Status Colors
- **Success**: #4caf50 (success messages)
- **Warning**: #ff9800 (warning messages)
- **Info**: #2196f3 (info messages)
- **Error**: #f44336 (error messages)

### Typography

#### Font Family
- **Primary**: Roboto (Google Fonts)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

#### Font Scale
- **H1**: 32px / 2rem (page titles)
- **H2**: 24px / 1.5rem (section headings)
- **H3**: 20px / 1.25rem (subsection headings)
- **H4**: 18px / 1.125rem (card titles)
- **H5**: 16px / 1rem (small headings)
- **H6**: 14px / 0.875rem (labels)
- **Body 1**: 16px / 1rem (main body text)
- **Body 2**: 14px / 0.875rem (secondary body text)
- **Caption**: 12px / 0.75rem (captions)

#### Font Weights
- **Light**: 300 (subtle text)
- **Regular**: 400 (body text)
- **Medium**: 500 (emphasis)
- **Bold**: 700 (headings)

### Spacing System

#### Base Unit
- **Base**: 8px (all spacing multiples)

#### Spacing Scale
- **xs**: 4px (tight spacing)
- **sm**: 8px (small spacing)
- **md**: 16px (medium spacing)
- **lg**: 24px (large spacing)
- **xl**: 32px (extra large spacing)
- **xxl**: 48px (maximum spacing)

### Component Styling

#### Cards
- **Elevation**: 1px shadow
- **Border Radius**: 8px
- **Padding**: 16px
- **Background**: White
- **Hover**: 2px shadow

#### Buttons
- **Primary**: Blue background, white text
- **Secondary**: Transparent, blue border
- **Text**: Transparent, blue text
- **Padding**: 12px 24px
- **Border Radius**: 4px

#### Forms
- **Inputs**: 1px solid border
- **Focus**: 2px solid primary blue
- **Error**: Red border with error message
- **Padding**: 12px 16px

### Animation and Transitions

#### Transitions
- **Duration**: 200-300ms
- **Easing**: cubic-bezier(0.25, 0.46, 0.45, 0.94)
- **Properties**: All animatable properties

#### Hover Effects
- **Elevation**: Subtle shadow increase
- **Transform**: TranslateY(-1px)
- **Color**: Slight color changes
- **Opacity**: Opacity transitions

#### Loading States
- **Spinners**: Circular progress indicators
- **Skeletons**: Placeholder content
- **Progress**: Linear progress bars
- **Pulse**: Subtle pulse animation

This comprehensive specification covers every UI component, interaction pattern, and visual element in the CV Lator application, providing complete details for implementation and maintenance.
