# E2E Tests

Comprehensive end-to-end tests for the CV Optimizer application using Playwright.

## Structure

```
tests/e2e/
├── auth.spec.ts              # Authentication flow tests
├── dashboard.spec.ts         # Dashboard functionality tests
├── cv-editor.spec.ts         # CV editor functionality tests
├── fixtures/
│   └── testData.ts          # Test data and sample content
├── helpers/
│   └── auth.ts              # Authentication helper functions
└── page-objects/
    ├── DashboardPage.ts     # Dashboard page object model
    ├── CVEditorPage.ts      # CV Editor page object model
    └── index.ts             # Page objects index
```

## Test Coverage

### Authentication (`auth.spec.ts`)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials  
- ✅ Form validation
- ✅ Password visibility toggle
- ✅ Logout functionality

### Dashboard (`dashboard.spec.ts`)
- ✅ Display dashboard correctly
- ✅ Create new CV from scratch
- ✅ Upload CV file
- ✅ Search CVs
- ✅ Edit existing CV
- ✅ Duplicate CV
- ✅ Delete CV
- ✅ Logout

### CV Editor (`cv-editor.spec.ts`)
- ✅ Load CV editor correctly
- ✅ Edit personal information
- ✅ Add work experience
- ✅ Edit existing work experience
- ✅ Delete work experience
- ✅ Add education
- ✅ Navigate back to dashboard
- ✅ Handle unsaved changes warning
- ✅ Form validation

## Page Object Models

### DashboardPage
Provides methods for:
- Navigation and user menu interactions
- CV management (create, upload, edit, delete, duplicate)
- Search functionality
- Dialog handling

### CVEditorPage  
Provides methods for:
- CV section editing (personal info, work experience, education)
- Form interactions and validation
- Save/cancel operations
- Navigation with unsaved changes handling

## Test Data

The `fixtures/testData.ts` file contains:
- Sample personal information
- Work experience data
- Education data
- Project data
- File paths for test documents

## Authentication

Tests use a dedicated test account:
- Email: `mahmoud.shahrud@gmail.com`
- Password: `pNm6h@n@q@fnHFM`

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test auth.spec.ts

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run tests with debugging
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Test IDs

The application components have been enhanced with `data-testid` attributes for reliable element selection:

### Dashboard
- `user-menu-button` - User menu button
- `create-new-cv-button` - Create new CV button (when CVs exist)
- `upload-cv-button` - Upload CV button (when CVs exist)
- `create-new-cv-empty-state-button` - Create CV button (empty state)
- `upload-cv-empty-state-button` - Upload CV button (empty state)
- `search-cvs-input` - Search input field
- `edit-cv-button-{cvId}` - Edit CV button for specific CV
- `delete-cv-button-{cvId}` - Delete CV button for specific CV
- `duplicate-cv-button-{cvId}` - Duplicate CV button for specific CV
- `delete-cv-dialog` - Delete confirmation dialog
- `cv-upload-dialog` - CV upload dialog

### CV Editor
- `cv-editor-back-button` - Back to dashboard button
- `cv-editor-user-menu-button` - User menu button
- `unsaved-changes-dialog` - Unsaved changes warning dialog
- `personal-info-full-name-input` - Full name input field
- `personal-info-email-input` - Email input field
- `personal-info-phone-input` - Phone input field
- `add-new-work-experience-button` - Add work experience button
- `edit-work-experience-item-{index}` - Edit work experience item
- `delete-work-experience-item-{index}` - Delete work experience item
- `save-work-experience-button` - Save work experience button
- `cancel-work-experience-button` - Cancel work experience button

## Best Practices

1. **Use Page Objects**: All interactions go through page object models for maintainability
2. **Reliable Selectors**: Tests use `data-testid` attributes instead of fragile CSS selectors
3. **Wait Strategies**: Tests use appropriate waits for async operations
4. **Test Isolation**: Each test is independent and can run in any order
5. **Error Handling**: Tests handle both success and error scenarios
6. **Realistic Data**: Tests use realistic sample data that matches actual usage

## Debugging

- Use `--headed` flag to see browser actions
- Use `--debug` flag to step through tests
- Use `page.pause()` in tests to pause execution
- Check `test-results/` directory for screenshots and videos on failures