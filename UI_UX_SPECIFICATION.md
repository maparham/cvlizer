# CV Lator UI/UX Specification

## Overview

The CV Lator UI/UX specification defines the visual design system, user interface patterns, and user experience flows for the AI-powered CV optimization platform. The design emphasizes clarity, efficiency, and professional aesthetics while maintaining accessibility and responsive design principles.

## Design System

### Color Palette

#### Primary Colors
- **Primary Blue**: `#1976d2` - Main brand color for buttons, links, and primary actions
- **Primary Blue Dark**: `#1565c0` - Hover states and active elements
- **Primary Blue Light**: `#42a5f5` - Light backgrounds and subtle accents

#### Secondary Colors
- **Secondary Red**: `#dc004e` - Error states, delete actions, and warnings
- **Secondary Red Dark**: `#c2185b` - Hover states for destructive actions
- **Secondary Red Light**: `#f8bbd9` - Light error backgrounds

#### Neutral Colors
- **Background**: `#ffffff` - Main background color
- **Surface**: `#f5f5f5` - Card and surface backgrounds
- **Border**: `#e0e0e0` - Subtle borders and dividers
- **Text Primary**: `#333333` - Main text color
- **Text Secondary**: `#666666` - Secondary text and labels
- **Text Disabled**: `#999999` - Disabled text and placeholders

#### Status Colors
- **Success**: `#4caf50` - Success messages and positive actions
- **Warning**: `#ff9800` - Warning messages and caution states
- **Info**: `#2196f3` - Information messages and neutral states
- **Error**: `#f44336` - Error messages and critical states

### Typography

#### Font Family
- **Primary**: Roboto (Google Fonts)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

#### Font Scale
- **H1**: 32px / 2rem - Page titles and main headings
- **H2**: 24px / 1.5rem - Section headings
- **H3**: 20px / 1.25rem - Subsection headings
- **H4**: 18px / 1.125rem - Card titles
- **H5**: 16px / 1rem - Small headings
- **H6**: 14px / 0.875rem - Labels and captions
- **Body 1**: 16px / 1rem - Main body text
- **Body 2**: 14px / 0.875rem - Secondary body text
- **Caption**: 12px / 0.75rem - Captions and fine print

#### Font Weights
- **Light**: 300 - Subtle text and captions
- **Regular**: 400 - Body text and labels
- **Medium**: 500 - Emphasis and subheadings
- **Bold**: 700 - Headings and important text

### Spacing System

#### Base Unit
- **Base**: 8px - All spacing multiples of 8px

#### Spacing Scale
- **xs**: 4px - Tight spacing for related elements
- **sm**: 8px - Small spacing for grouped elements
- **md**: 16px - Medium spacing for sections
- **lg**: 24px - Large spacing for major sections
- **xl**: 32px - Extra large spacing for page sections
- **xxl**: 48px - Maximum spacing for hero sections

### Component Design Patterns

#### Cards
- **Elevation**: 1px shadow for subtle depth
- **Border Radius**: 8px for modern appearance
- **Padding**: 16px internal spacing
- **Background**: White with subtle border
- **Hover State**: Slight elevation increase (2px shadow)

#### Buttons

##### Primary Button
- **Background**: Primary blue (#1976d2)
- **Text**: White
- **Padding**: 12px 24px
- **Border Radius**: 4px
- **Font Weight**: 500
- **Hover**: Darker blue (#1565c0)
- **Disabled**: Light gray background with disabled text

##### Secondary Button
- **Background**: Transparent
- **Text**: Primary blue
- **Border**: 1px solid primary blue
- **Padding**: 12px 24px
- **Border Radius**: 4px
- **Hover**: Light blue background

##### AI Tools Button
- **Background**: Transparent
- **Text**: Primary blue (#1976d2)
- **Border**: 1px solid primary blue
- **Padding**: 12px 24px
- **Border Radius**: 4px
- **Icon**: AutoAwesome icon (sparkle)
- **Hover**: Light blue background with darker border
- **Disabled**: Hidden for new CVs (not saved)

##### Text Button
- **Background**: Transparent
- **Text**: Primary blue
- **Padding**: 8px 16px
- **Hover**: Light blue background
- **No Border**: Clean, minimal appearance

#### Form Elements

##### Text Input
- **Border**: 1px solid #e0e0e0
- **Border Radius**: 4px
- **Padding**: 12px 16px
- **Font Size**: 16px
- **Focus State**: 2px solid primary blue border
- **Error State**: Red border with error message below

##### Select Dropdown
- **Appearance**: Custom styled select
- **Arrow**: Material-UI dropdown arrow
- **Options**: Consistent with text input styling
- **Hover**: Light background highlight

##### Checkbox/Radio
- **Size**: 20px x 20px
- **Color**: Primary blue when checked
- **Label**: 14px text with 8px spacing
- **Focus**: Outline ring for accessibility

#### Navigation

##### App Bar
- **Height**: 64px
- **Background**: White with subtle shadow
- **Padding**: 0 24px
- **Logo**: Left-aligned, 24px height
- **Actions**: Right-aligned, 8px spacing

##### Sidebar Navigation
- **Width**: 240px (expanded), 64px (collapsed)
- **Background**: White with right border
- **Items**: 48px height with 16px padding
- **Active State**: Primary blue background with white text
- **Hover State**: Light gray background

## Page Layouts

### Home Page Layout

#### Hero Section
- **Background**: Gradient from #667eea to #764ba2
- **Height**: 400px minimum
- **Content**: Centered with max-width container
- **Typography**: Large heading (H1) with subtitle (H5)
- **Actions**: Primary and secondary buttons
- **Responsive**: Stacked on mobile, side-by-side on desktop

#### Features Section
- **Layout**: 3-column grid on desktop, single column on mobile
- **Cards**: Feature cards with icons, titles, and descriptions
- **Spacing**: 24px between cards
- **Icons**: 48px emoji or icon size
- **Typography**: H4 titles with body text descriptions

#### Call-to-Action Section
- **Background**: Light gray (#f5f5f5)
- **Content**: Centered text with action buttons
- **Spacing**: 48px vertical padding
- **Buttons**: Primary and secondary button pair

### Dashboard Layout

#### Header
- **App Bar**: White background with shadow
- **Title**: "My CVs" with count badge
- **Actions**: Upload button, search, user menu
- **Search**: Full-width search bar with icon

#### CV Grid
- **Layout**: Responsive grid (1-4 columns based on screen size)
- **Card Size**: 300px width, auto height
- **Spacing**: 16px between cards
- **Content**: Thumbnail, title, status, actions
- **Hover**: Slight elevation increase

#### CV Card Design
- **Header**: CV title with status indicator
- **Body**: Preview thumbnail or placeholder
- **Footer**: Action buttons (edit, delete, duplicate)
- **Status**: Color-coded status chips
- **Loading**: Skeleton loading animation

### CV Editor Layout

#### Header
- **App Bar**: Light gray background (#f5f5f5)
- **Navigation**: Back button with breadcrumb
- **Actions**: AI Tools shortcut button, Export, delete, user menu
- **Height**: 48px for compact design
- **Button Layout**: AI Tools shortcut button positioned before Export button
- **AI Tools Button**: Only visible for saved CVs, instant access to AI features

#### Main Content
- **Layout**: Two-column layout (editor + preview)
- **Editor**: Left side, scrollable form sections
- **Preview**: Right side, fixed preview panel
- **Responsive**: Stacked on mobile devices

#### Section Editing
- **Sections**: Collapsible sections with headers
- **Fields**: Inline editing with validation
- **Actions**: Add, edit, delete, reorder buttons
- **Validation**: Real-time validation with error messages

## Component Specifications

### CV Editor Header Components

#### AI Tools Shortcut Button
- **Position**: Located in CV editor header, positioned before Export button
- **Visibility**: Only visible for saved CVs (hidden for new/unsaved CVs)
- **Icon**: AutoAwesome (sparkle) icon with "AI Tools" label
- **Styling**: Secondary button style with primary blue color scheme
- **Functionality**: Single click switches sidebar to AI Tools tab
- **User Feedback**: Immediate tab switch with visual indication
- **Accessibility**: Proper ARIA labels and keyboard navigation support

### CV Upload Component

#### Drag & Drop Area
- **Size**: 400px x 200px minimum
- **Border**: 2px dashed #e0e0e0
- **Background**: White with hover state
- **Text**: "Drag and drop your CV here" with file type info
- **Icon**: Upload icon (48px) above text
- **Hover**: Border color changes to primary blue
- **Active**: Border becomes solid primary blue

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

### CV Editor Components

#### Section Headers
- **Background**: Light gray (#f5f5f5)
- **Padding**: 12px 16px
- **Typography**: H5 with medium weight
- **Actions**: Edit, collapse, add buttons
- **Border**: Bottom border for separation

#### Inline Editing
- **Input**: Full-width text input
- **Border**: None (clean appearance)
- **Focus**: Primary blue underline
- **Validation**: Red underline for errors
- **Save**: Auto-save with visual feedback

#### Drag & Drop Lists
- **Items**: 48px height with padding
- **Handle**: Drag handle on left side
- **Hover**: Light blue background
- **Dragging**: Elevated with shadow
- **Drop Zone**: Highlighted drop areas

### Notification System

#### Toast Notifications
- **Position**: Top-right corner
- **Width**: 400px maximum
- **Animation**: Slide-in from right
- **Duration**: 5 seconds (auto-dismiss)
- **Types**: Success (green), Error (red), Warning (orange), Info (blue)

#### Alert Messages
- **Position**: Top of content area
- **Width**: Full width with padding
- **Background**: Colored background based on type
- **Icon**: Status icon on left side
- **Dismiss**: X button on right side

## Responsive Design

### Breakpoints
- **Mobile**: 0-599px
- **Tablet**: 600-959px
- **Desktop**: 960px+

### Mobile Adaptations

#### Navigation
- **App Bar**: Hamburger menu for navigation
- **Sidebar**: Overlay sidebar with backdrop
- **Actions**: Icon-only buttons with tooltips

#### Layout
- **Grid**: Single column layout
- **Cards**: Full-width cards
- **Spacing**: Reduced padding and margins
- **Typography**: Smaller font sizes

#### Forms
- **Inputs**: Full-width inputs
- **Buttons**: Full-width primary buttons
- **Labels**: Stacked above inputs

### Tablet Adaptations

#### Layout
- **Grid**: 2-column layout for cards
- **Sidebar**: Collapsible sidebar
- **Forms**: Side-by-side form elements

#### Navigation
- **App Bar**: Full navigation with icons
- **Actions**: Icon + text buttons

## Accessibility

### Color Contrast
- **Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Clear focus indicators

### Keyboard Navigation
- **Tab Order**: Logical tab sequence
- **Focus Indicators**: Clear focus rings
- **Skip Links**: Skip to main content
- **Keyboard Shortcuts**: Common actions accessible via keyboard

### Screen Reader Support
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Semantic HTML**: Proper heading hierarchy
- **Alt Text**: Descriptive alt text for images
- **Live Regions**: Dynamic content announcements

### Motion and Animation
- **Reduced Motion**: Respect user preferences
- **Duration**: Maximum 300ms for transitions
- **Easing**: Smooth, natural easing functions
- **Purpose**: Animations should enhance, not distract

## User Experience Flows

### CV Upload Flow
1. **Landing**: User clicks "Upload CV" button
2. **Modal**: Upload modal opens with drag-drop area
3. **File Selection**: User drags file or clicks to select
4. **Validation**: File type and size validation (PDF, DOC, DOCX up to 10MB)
5. **Preview**: File preview with confirmation
6. **Upload**: Progress indicator during upload
7. **Processing**: AI parsing with background thread processing
8. **Completion**: Success message with navigation to editor

### CV Editing Flow
1. **Selection**: User selects CV from dashboard
2. **Loading**: CV data loads with skeleton animation
3. **Editor**: PDF-style editor with sidebar section management
4. **Editing**: User edits sections with inline editing
5. **Validation**: Real-time validation feedback
6. **Auto-save**: Changes saved automatically with context management
7. **Preview**: Live preview updates in PDF-style layout
8. **Export**: LaTeX-based PDF export functionality
9. **History**: Version tracking and restoration capabilities

### AI Enhancement Flow
1. **Quick Access**: User clicks AI Tools shortcut button in CV editor header for instant access to AI features
2. **Job Description**: User adds job description via text or URL (with paste support)
3. **URL Parsing**: For URL inputs, Selenium-based browser automation extracts content from JavaScript-heavy sites
4. **Background Processing**: URL parsing runs in background with progress indicator
5. **Analysis**: AI analyzes CV and job requirements using OpenAI GPT-4o-mini
6. **Generation**: AI generates tailored "Why I'm a Good Fit" content and suggestions
7. **Review**: User reviews generated content in dedicated AI Tools tab
8. **Accept/Reject**: User accepts or rejects individual suggestions
9. **Integration**: Accepted content integrated into CV sections with auto-save

### Admin Impersonation Flow
1. **Admin Access**: Admin user accesses admin dashboard
2. **User Selection**: Admin selects user to impersonate
3. **Session Creation**: Secure impersonation session created
4. **Banner Display**: Impersonation banner shows current context
5. **User Experience**: Admin experiences app as target user
6. **Session End**: Admin ends impersonation with confirmation
7. **Audit Logging**: All impersonation activities logged

## Performance Considerations

### Loading States
- **Skeleton Screens**: For content loading
- **Progress Indicators**: For file uploads and AI processing
- **Browser Automation Loading**: For JavaScript-heavy job site parsing
- **Lazy Loading**: For images and heavy components
- **Optimistic Updates**: Immediate UI feedback
- **Background Processing**: Thread pool for CV parsing
- **Context-Based Loading**: React Context loading states

### Visual Feedback
- **Hover States**: Clear hover indicators
- **Active States**: Pressed button states
- **Loading States**: Spinners and progress bars
- **Success States**: Confirmation animations
- **Error States**: Clear error messaging

### Animation Guidelines
- **Purpose**: Enhance usability, not decoration
- **Performance**: 60fps animations
- **Accessibility**: Respect reduced motion preferences
- **Consistency**: Use consistent timing and easing

## Advanced Features

### Impersonation Interface
- **Admin Banner**: Prominent banner during impersonation
- **Session Management**: Secure session-based impersonation
- **User Context**: Clear indication of current user context
- **Security Validation**: IP and user agent validation

### Version History Interface
- **History Panel**: Right-side sliding drawer with resizable width
- **Diff Viewer**: Side-by-side comparison using react-diff-viewer-continued with syntax highlighting
- **Version Management**: Create manual snapshots, restore previous versions, delete versions
- **Change Tracking**: Automatic snapshot creation on significant changes
- **Diff Visualization**: JSON-based diff showing added (green), removed (red), and modified (yellow) content
- **Version Metadata**: Timestamps, version numbers, change summaries, and change types
- **Navigation**: Easy navigation between versions with grouped date display

### Advanced Authentication
- **Clerk Integration**: Modern authentication with social providers
- **JWKS Verification**: Production-ready token verification
- **Development Modes**: Flexible development authentication
- **User Synchronization**: Automatic user data sync

### Browser Automation Features
- **JavaScript Site Support**: Selenium-based automatic handling of JavaScript-heavy job sites
- **URL Parsing**: Seamless extraction from complex job posting URLs (e.g., jobs.wien.gv.at)
- **Content Quality**: High-quality content extraction with formatting preservation
- **Error Handling**: Graceful fallback for unsupported or problematic sites
- **Loading States**: Clear progress indicators during browser automation with "parsing" status
- **Performance**: Optimized browser automation with headless Chrome
- **Background Processing**: URL parsing runs in background thread pool
- **Fallback Logic**: Standard scraping attempted first, Selenium used if needed

This UI/UX specification provides comprehensive guidelines for creating a consistent, accessible, and user-friendly interface for the CV Lator application, ensuring a professional and intuitive user experience across all devices and user types, with advanced features for admin management and version control.
