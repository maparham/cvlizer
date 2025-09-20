# CV Lator - Frontend UI/UX Specification

## Overview

The CV Lator frontend is a modern, responsive web application built with React 18, TypeScript, and Material-UI. It provides an intuitive interface for CV management, editing, and AI-powered optimization with a focus on user experience, accessibility, and professional design.

## Design System

### Color Palette
- **Primary**: #1976d2 (Material Blue)
- **Secondary**: #dc004e (Material Pink)
- **Background**: Light theme with subtle gradients
- **Text**: #333 (dark gray) for primary text, #666 for secondary
- **Success**: #4caf50 (Green)
- **Warning**: #ff9800 (Orange)
- **Error**: #f44336 (Red)
- **Info**: #2196f3 (Light Blue)

### Typography
- **Font Family**: Material-UI default (Roboto)
- **Headings**: 
  - H1: 2.125rem (34px), weight 300
  - H4: 2rem (32px), weight 400
  - H6: 1.25rem (20px), weight 500
- **Body**: 1rem (16px), weight 400
- **Caption**: 0.875rem (14px), weight 400

### Spacing System
- **Base Unit**: 8px
- **Common Spacing**: 8px, 16px, 24px, 32px, 48px
- **Component Padding**: 16px-24px
- **Card Margins**: 16px-24px

### Border Radius
- **Small**: 8px (buttons, chips)
- **Medium**: 12px (cards, inputs)
- **Large**: 16px (dialogs, major containers)

## Page Layouts & Components

### 1. Authentication Pages

#### Login Page (`/login`)
**Layout**: Centered single-column layout
- **Container**: Max-width 400px, centered vertically and horizontally
- **Paper**: Elevated card with 24px padding
- **Header**: Centered title with subtitle
- **Form Elements**:
  - Email field with auto-focus
  - Password field with show/hide toggle
  - Submit button (full-width, primary color)
  - Link to registration page
- **Error Handling**: Red alert banner for authentication errors
- **Loading State**: Disabled button with "Signing In..." text

**Visual Hierarchy**:
```
┌─────────────────────────┐
│      CV Optimizer       │
│                         │
│     [Sign In Form]      │
│                         │
│  Email: [___________]   │
│  Pass:  [___________]   │
│                         │
│  [Sign In Button]       │
│                         │
│  Don't have account?    │
│  Sign up here           │
└─────────────────────────┘
```

#### Registration Page (`/register`)
- Similar layout to login page
- Additional fields for password confirmation
- Terms and conditions checkbox
- Success message after registration

### 2. Dashboard Page (`/dashboard`)

#### Header Section
- **App Bar**: Fixed top navigation with:
  - "CV Optimizer" title (left)
  - User account menu (right) with logout option
- **Page Title**: "My CVs" with descriptive subtitle
- **Action Buttons**: "Create New CV" and "Upload CV" (right-aligned)

#### Empty State (No CVs)
- **Centered Layout**: Large icon, title, and description
- **Call-to-Action**: Two prominent buttons
- **Background**: Subtle gradient (light blue to light gray)
- **Visual Elements**:
  - Large document icon (80px, primary color)
  - Welcome message
  - Feature description
  - Action buttons with icons

#### CV Grid (With CVs)
- **Search & Filter Bar**: 
  - Search input with magnifying glass icon
  - Filter chips: All, Ready, Processing, Errors
  - Sort controls: Date/Name with direction toggle
- **Card Grid**: 3-column responsive layout (lg), 2-column (sm), 1-column (xs)

#### CV Card Design
**Dimensions**: 100% height cards with flex layout
**Visual Effects**: 
- Subtle shadow with hover elevation
- Smooth transform on hover (translateY(-4px))
- Rounded corners (12px)

**Card Structure**:
```
┌─────────────────────────┐
│ [Title] [Status Icon]   │
│ [File Type] [Sections]  │
│ Created: DD.MM.YYYY     │
│ [Progress Bar] (if proc)│
│                         │
│ [Edit CV] [Delete]      │
└─────────────────────────┘
```

**Card Elements**:
- **Editable Title**: Inline editing with save/cancel
- **Status Indicators**: 
  - ✅ Green checkmark (ready)
  - ⏳ Orange hourglass (processing)
  - ❌ Red error icon (failed)
- **Metadata Chips**:
  - File type (PDF/DOC) with download icon
  - Section count for parsed CVs
- **Progress Indicator**: Linear progress bar for processing CVs
- **Action Buttons**: 
  - Primary "Edit CV" button (disabled during processing)
  - Secondary delete button with confirmation dialog

#### Search & Filter Functionality
- **Real-time Search**: Filters by CV name
- **Status Filters**: Clickable chips with counts
- **Sort Options**: Date (newest first) or Name (alphabetical)
- **Visual Feedback**: Active filters highlighted in primary color

### 3. CV Editor Page (`/cv/:cvId`)

#### Layout Structure
**Three-Panel Layout**:
- **Left Sidebar**: Section management (300px width)
- **Main Content**: PDF-style CV editor (flexible width)
- **Right Panel**: History panel (400px width, slide-out drawer)

#### Header
- **Minimal Design**: Light background (#f5f5f5)
- **Navigation**: Back arrow to dashboard
- **Breadcrumb**: "Dashboard" text
- **User Menu**: Account icon (right-aligned)
- **Unsaved Changes Warning**: Confirmation dialog on navigation

#### Section Management Sidebar (Left)
**Fixed Width**: 300px with smooth animations
**Sections**:
- **CV Title**: Editable with save button
- **Section List**: Drag-and-drop reorderable list
- **Visibility Toggles**: Eye icons for each section
- **Add Section Button**: Dropdown with available sections
- **Reset Button**: Restore original order
- **History Button**: Open version history panel

**Section List Design**:
```
┌─────────────────────────┐
│ [Editable CV Title]     │
│ ─────────────────────── │
│ [👁] Personal Info      │
│ [👁] Professional Sum   │
│ [👁] Work Experience    │
│ [👁] Education          │
│ [👁] Skills             │
│ [👁] Certifications     │
│ [👁] Projects           │
│ [👁] Awards             │
│ [👁] Publications       │
│ [👁] Volunteer Exp      │
│                         │
│ [+ Add Section ▼]       │
│ [↻ Reset Order]         │
│ [📊 History]            │
└─────────────────────────┘
```

#### Main Content Area (Center)
**PDF-Style Layout**: A4-like proportions with realistic styling
**Features**:
- **Real-time Preview**: Live updates as user types
- **Section Editing**: Click-to-edit interface
- **Auto-save**: Automatic saving with visual feedback
- **Responsive Design**: Adapts to screen size

**Content Structure**:
```
┌─────────────────────────┐
│     [CV Title]          │
│                         │
│ Personal Information    │
│ [Name] [Email] [Phone]  │
│                         │
│ Professional Summary    │
│ [Multi-line text area]  │
│                         │
│ Work Experience         │
│ [Company] [Position]    │
│ [Date Range]            │
│ [Description]           │
│                         │
│ Education               │
│ [Institution] [Degree]  │
│                         │
│ Skills                  │
│ [Technical] [Soft]      │
│                         │
│ [Additional Sections]   │
└─────────────────────────┘
```

#### History Panel (Right, Slide-out)
**Trigger**: Floating handle button or sidebar button
**Animation**: Smooth slide-in from right (400px width)
**Features**:
- **Timeline View**: Chronological list of versions
- **Version Details**: Timestamp, change type, description
- **Actions**: Preview, restore, delete
- **Manual Snapshots**: Create labeled checkpoints
- **Statistics**: Storage usage, entry counts

**History Panel Design**:
```
┌─────────────────────────┐
│ History        [✕]      │
│ ─────────────────────── │
│ Today                   │
│ [📝] Manual save        │
│     2 minutes ago       │
│     [Preview] [Restore] │
│                         │
│ [📝] Section edited     │
│     15 minutes ago      │
│     [Preview] [Restore] │
│                         │
│ Yesterday               │
│ [🤖] Auto save          │
│     2 hours ago         │
│     [Preview] [Restore] │
│                         │
│ [+ Create Snapshot]     │
│ [📊 Statistics]         │
└─────────────────────────┘
```

### 4. CV Section Components

#### Personal Information Section
**Layout**: Two-column grid for contact details
**Fields**:
- Full Name (prominent, large text)
- Email, Phone, Location (standard inputs)
- LinkedIn URL, Website URL (with validation)
- Optional: GitHub, Portfolio URLs

#### Professional Summary
**Layout**: Full-width text area
**Features**:
- Rich text editing
- Keyword highlighting
- Character count indicator
- Auto-resize textarea

#### Work Experience Section
**Layout**: List of experience entries
**Each Entry**:
- Company name (prominent)
- Position title
- Location and date range
- Description (multi-line)
- Achievements (bullet list)
- Technologies (tag input)

**Interactive Elements**:
- Add/Remove entries
- Drag-and-drop reordering
- Expandable descriptions
- Auto-complete for companies

#### Education Section
**Layout**: Similar to work experience
**Fields**:
- Institution name
- Degree and field of study
- Date range with "Current" option
- GPA (optional)
- Honors and achievements
- Relevant coursework

#### Skills Section
**Layout**: Categorized skill groups
**Categories**:
- Technical skills (tag input)
- Soft skills (tag input)
- Languages (with proficiency levels)
- Optional: Frameworks, Tools, Databases

#### Additional Sections
**Projects**: Name, description, technologies, URLs
**Certifications**: Name, issuer, dates, credential ID
**Awards**: Name, issuer, date, description
**Publications**: Title, authors, journal, date, DOI
**Volunteer Experience**: Organization, role, dates, description

### 5. Interactive Features

#### Drag & Drop
**Implementation**: @dnd-kit library
**Features**:
- Visual drag indicators
- Drop zones with highlighting
- Smooth animations
- Reorder feedback

#### Auto-save
**Behavior**: 
- Save after 2 seconds of inactivity
- Visual indicator (small dot or text)
- Error handling with retry
- Conflict resolution

#### Form Validation
**Real-time Validation**:
- Email format checking
- URL validation
- Required field indicators
- Character limits

#### Responsive Design
**Breakpoints**:
- Mobile: < 600px (single column)
- Tablet: 600px - 960px (two column)
- Desktop: > 960px (three column)

### 6. Modal Dialogs & Overlays

#### File Upload Dialog
**Trigger**: Upload button on dashboard
**Features**:
- Drag-and-drop file area
- File type validation
- Progress indicator
- Success/error messages

#### Delete Confirmation
**Design**: Standard Material-UI dialog
**Content**: 
- Warning message
- CV name confirmation
- Cancel/Delete buttons
- Loading state for delete action

#### Version Preview Dialog
**Content**: Side-by-side comparison
**Features**:
- Current vs. selected version
- Highlighted differences
- Restore button
- Close without changes

#### Create Snapshot Dialog
**Fields**:
- Label (required)
- Description (optional)
- Auto vs. manual indicator

### 7. Loading States & Feedback

#### Loading Indicators
**Types**:
- Linear progress (file uploads)
- Circular progress (API calls)
- Skeleton screens (content loading)
- Shimmer effects (smooth loading)

#### Success Messages
**Toast Notifications**: 
- Top-right positioning
- Auto-dismiss after 4 seconds
- Success icon and message
- Manual dismiss option

#### Error Handling
**Error Types**:
- Validation errors (inline)
- Network errors (toast)
- Server errors (modal dialog)
- Retry mechanisms

### 8. Accessibility Features

#### Keyboard Navigation
- Tab order optimization
- Keyboard shortcuts for common actions
- Focus indicators
- Skip links for screen readers

#### Screen Reader Support
- ARIA labels for interactive elements
- Descriptive alt text for icons
- Status announcements for dynamic content
- Semantic HTML structure

#### Visual Accessibility
- High contrast mode support
- Scalable text (up to 200%)
- Color-blind friendly palette
- Focus indicators

### 9. Animation & Transitions

#### Page Transitions
- Smooth route transitions
- Loading state animations
- Error state transitions

#### Component Animations
- Card hover effects
- Button press feedback
- Modal slide-in/out
- Drawer slide animations

#### Micro-interactions
- Button ripple effects
- Input focus animations
- Success checkmark animations
- Progress bar animations

### 10. Mobile Experience

#### Touch Interactions
- Swipe gestures for navigation
- Touch-friendly button sizes (44px minimum)
- Pull-to-refresh functionality
- Long-press context menus

#### Mobile Layout
- Collapsible sidebar
- Full-screen modals
- Bottom sheet for actions
- Responsive grid system

#### Performance
- Lazy loading for images
- Virtual scrolling for long lists
- Optimized bundle sizes
- Progressive web app features

### 11. Data Visualization

#### Progress Indicators
- File upload progress
- Parsing status
- Save status
- Processing indicators

#### Statistics Display
- History storage usage
- Section completion status
- CV analytics (if implemented)

### 12. Theme & Customization

#### Light Theme (Default)
- Clean, professional appearance
- High contrast for readability
- Subtle shadows and borders
- Material Design principles

#### Future Dark Theme Support
- Inverted color scheme
- Reduced eye strain
- Consistent with system preferences

## User Experience Flow

### 1. First-time User Journey
1. **Landing**: Welcome message with clear value proposition
2. **Registration**: Simple form with email/password
3. **Onboarding**: Guided tour of key features
4. **First CV**: Easy upload or creation process
5. **Editing**: Intuitive section-based editing
6. **Success**: Positive feedback and next steps

### 2. Returning User Flow
1. **Dashboard**: Quick access to recent CVs
2. **Search/Filter**: Find specific CVs quickly
3. **Edit**: Seamless editing experience
4. **Save**: Automatic saving with manual options
5. **History**: Access to previous versions

### 3. Error Recovery
1. **Clear Error Messages**: Specific, actionable feedback
2. **Retry Mechanisms**: Easy retry for failed operations
3. **Data Recovery**: Unsaved changes protection
4. **Support Access**: Help and contact information

## Performance Requirements

### Loading Times
- **Initial Load**: < 2 seconds
- **Navigation**: < 500ms
- **File Upload**: Progress indication
- **Auto-save**: < 1 second

### Responsiveness
- **Touch Targets**: Minimum 44px
- **Input Delay**: < 100ms
- **Animation**: 60fps smooth transitions
- **Scroll Performance**: Smooth scrolling

### Accessibility Standards
- **WCAG 2.1 AA**: Full compliance
- **Keyboard Navigation**: Complete functionality
- **Screen Reader**: Full compatibility
- **Color Contrast**: 4.5:1 minimum ratio

This specification provides a comprehensive guide for implementing the CV Lator frontend with consistent design, excellent user experience, and professional functionality that matches the sophisticated backend capabilities.
