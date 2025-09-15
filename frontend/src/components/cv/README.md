# CV Components Package

This package contains all CV-related React components organized in a clean, modular structure.

## 📁 Package Structure

```
cv/
├── core/                    # Core components and utilities
│   ├── BaseSection.tsx     # Base section wrapper component
│   ├── ArraySection.tsx    # Reusable array section component
│   ├── SortableSectionItem.tsx  # Sortable section item component
│   ├── hooks.ts            # Common hooks for CV sections
│   └── index.ts            # Core exports
├── ui/                      # UI-specific components
│   ├── JobPositionAutocomplete.tsx
│   ├── LocationAutocomplete.tsx
│   └── index.ts            # UI exports
├── sections/                # CV section components
│   ├── PersonalInfoSection.tsx
│   ├── ProfessionalSummarySection.tsx
│   ├── WorkExperienceSection.tsx
│   ├── EducationSection.tsx
│   ├── SkillsSection.tsx
│   └── index.ts            # Section exports
├── constants/               # CV-related constants
│   └── index.ts            # Constants exports
├── types.ts                # TypeScript type definitions
├── PDFCVEditor.tsx         # Main CV editor component
├── CVUpload.tsx            # CV upload component
├── index.ts                # Main package exports
└── README.md               # This file
```

## 🎯 Organization Principles

### Core (`/core`)
- **Base components** that provide fundamental functionality
- **Reusable utilities** and hooks
- **Generic components** that can be used across different CV sections

### UI (`/ui`)
- **UI-specific components** like autocomplete fields
- **Form components** that are specific to CV editing
- **Interactive elements** that enhance user experience

### Sections (`/sections`)
- **Business logic components** for each CV section
- **Section-specific** implementations
- **Data handling** for individual CV sections

### Constants (`/constants`)
- **CV section types** and identifiers
- **Default configurations** and settings
- **Auto-save messages** and other constants

## 🔧 Usage

```typescript
// Import main components
import { PDFCVEditor, CVUpload } from '@/components/cv'

// Import core components
import { BaseSection, ArraySection, useSectionAutoSave } from '@/components/cv'

// Import UI components
import { JobPositionAutocomplete, LocationAutocomplete } from '@/components/cv'

// Import specific sections
import { PersonalInfoSection, WorkExperienceSection } from '@/components/cv'

// Import constants
import { CV_SECTION_TYPES, AUTO_SAVE_MESSAGES } from '@/components/cv'
```

## 🏗️ Architecture Benefits

1. **Separation of Concerns**: Core logic is separated from UI components
2. **Reusability**: Core components can be reused across different sections
3. **Maintainability**: Clear folder structure makes it easy to find and modify components
4. **Scalability**: Easy to add new sections or UI components
5. **Type Safety**: Centralized type definitions and constants

## 📝 Adding New Components

### New CV Section
1. Create component in `/sections`
2. Export from `/sections/index.ts`
3. Add section type to `/constants/index.ts`

### New UI Component
1. Create component in `/ui`
2. Export from `/ui/index.ts`

### New Core Component
1. Create component in `/core`
2. Export from `/core/index.ts`
3. Update types if needed in `/types.ts`
