# AI Suggestions Inline Diff System

This document describes the implementation of the AI suggestions inline diff system for the CV editor.

## Overview

The inline diff system allows users to see AI suggestions applied as highlighted overlays directly in CV sections, with a floating panel to manage approvals. The system is designed to be simple, unobtrusive, and maintain the existing CV editing workflow.

## Architecture

### Core Components

1. **InlineDiffProvider**: Context provider that manages suggestion state
2. **SuggestionHighlight**: Visual highlighting wrapper for suggested changes
3. **FloatingSuggestionsPanel**: Management panel for accepting/rejecting suggestions
4. **SectionFactory**: Dynamic section rendering with diff support
5. **PDFCVEditorWithAI**: Enhanced editor with AI integration

### Data Flow

```
User clicks "Generate AI Suggestions" 
  ↓
AI Service analyzes CV + Job Description
  ↓
Suggestions stored in AI Store
  ↓
Temp CV state created with all suggestions applied
  ↓
Section components render with highlighted changes
  ↓
User accepts/rejects individual suggestions
  ↓
Final changes committed to actual CV data
```

## Usage

### Basic Integration

Replace the regular `PDFCVEditor` with `PDFCVEditorWithAI`:

```tsx
import PDFCVEditorWithAI from './components/cv/PDFCVEditorWithAI';

// Use instead of PDFCVEditor
<PDFCVEditorWithAI
  title={cvTitle}
  onTitleSave={handleTitleSave}
  cvId={cvId}
/>
```

### Section-Specific Highlighting

Sections automatically get diff support through the `SectionFactory`. For custom sections:

```tsx
import { useInlineDiffSection } from '../../../hooks/useInlineDiffSection';
import { SuggestionHighlight } from '../ai/SuggestionHighlight';

const CustomSection: React.FC<SectionProps> = ({ data, ...props }) => {
  const { displayData, suggestions, shouldHighlight } = useInlineDiffSection({
    section: 'custom_section',
    originalData: data,
  });

  return (
    <div>
      {shouldHighlight ? (
        <SuggestionHighlight
          suggestion={suggestions[0]}
          section="custom_section"
        >
          <CustomContent data={displayData} />
        </SuggestionHighlight>
      ) : (
        <CustomContent data={displayData} />
      )}
    </div>
  );
};
```

## Features

### Visual Highlighting

- **Green background**: New additions (keywords, content)
- **Yellow background**: Modified content  
- **Red strikethrough**: Removed content
- **Status indicators**: Pending (⏳), Approved (✅), Rejected (❌)

### Floating Panel

- **Collapsible interface** that doesn't obstruct editing
- **Suggestion list** with descriptions and context
- **Quick actions** (accept/reject) for each suggestion
- **Bulk operations** (accept all, reject all)
- **Navigation** to relevant sections

### Smart Suggestions

- **Keyword additions** to skills sections
- **Content enhancements** for summaries
- **Section improvements** based on job descriptions
- **Context-aware placement** in appropriate sections

## API Reference

### Hooks

#### `useInlineDiffContext()`
Main hook for accessing diff functionality.

```tsx
const {
  isInDiffMode,
  suggestions,
  acceptSuggestion,
  rejectSuggestion,
  // ... other methods
} = useInlineDiffContext();
```

#### `useInlineDiffSection(options)`
Hook for section-specific diff integration.

```tsx
const {
  displayData,      // Data with suggestions applied
  originalData,     // Original data without suggestions
  suggestions,      // Suggestions for this section
  shouldHighlight,  // Whether to show highlighting
} = useInlineDiffSection({
  section: 'skills',
  fieldPath: 'technical',
  originalData: data,
});
```

#### `useHighlightedKeywords(section, fieldPath, originalKeywords)`
Specialized hook for keyword highlighting.

```tsx
const { highlightedKeywords, newKeywords } = useHighlightedKeywords(
  'skills',
  'technical', 
  originalTechnicalSkills
);
```

### Components

#### `<SuggestionHighlight>`
Wrapper component for highlighted content.

Props:
- `suggestion`: The AISuggestion object
- `section`: Section identifier
- `fieldPath`: Optional field path
- `children`: Content to highlight

#### `<FloatingSuggestionsPanel>`
Main management panel.

Props:
- `onNavigateToSuggestion`: Optional navigation handler

#### `<SectionFactory>`
Dynamic section renderer.

Props:
- `sectionType`: Type of section to render
- `...sectionProps`: Standard section props

## Customization

### Adding New Diff-Enabled Sections

1. Create a section component with diff support:

```tsx
const MySectionWithDiff: React.FC<SectionProps> = (props) => {
  // Use diff hooks and highlighting components
};
```

2. Add to `SectionFactory` diff sections map:

```tsx
const DIFF_SECTIONS = {
  // ... existing sections
  my_section: MySectionWithDiff,
};
```

### Custom Suggestion Types

Extend the `SuggestionType` and add handling logic:

```tsx
export type SuggestionType = 
  | 'add_keyword' 
  | 'enhance_content' 
  | 'add_section'
  | 'custom_suggestion_type';  // Add your type
```

### Styling Customization

Override the theme-based styling in `SuggestionHighlight`:

```tsx
const CustomHighlightWrapper = styled(Box)<HighlightProps>(({ theme, changeType, status }) => ({
  // Custom styling based on your design system
}));
```

## Error Handling

The system includes comprehensive error handling:

- **Graceful degradation** when suggestions fail
- **Clear error messages** for failed operations
- **Automatic fallback** to regular editing mode
- **Data protection** during suggestion process

## Performance Considerations

- **Efficient re-renders** using React.memo and useMemo
- **Lazy loading** of diff components
- **Optimized suggestion matching** algorithms
- **Minimal DOM updates** during highlighting

## Testing

The system includes comprehensive tests covering:

- Suggestion generation and application
- Visual highlighting and interactions
- Panel management and navigation
- Error scenarios and edge cases
- Performance under various data sizes

## Browser Compatibility

Tested and supported on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Limitations

1. **Complex nested suggestions** may require manual review
2. **Large CVs** (>50 sections) may experience slight performance impact
3. **Mobile responsiveness** is optimized for tablets and up
4. **Screen readers** have basic support (improvements ongoing)

## Future Enhancements

- **Real-time collaboration** on suggestions
- **Suggestion history** and versioning
- **Custom suggestion templates**
- **Advanced AI models** integration
- **Batch suggestion processing**
