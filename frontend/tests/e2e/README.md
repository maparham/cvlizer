# End-to-End (E2E) Tests

This directory contains Playwright-based end-to-end tests for the CV Optimizer frontend application.

## Overview

The E2E tests simulate real user interactions with the application, testing the complete user journey from login to CV management functionality.

## Test Structure

```
tests/e2e/
├── README.md                              # This file
├── helpers/                              # Test utility functions
│   ├── auth.ts                           # Authentication helpers
│   └── work-experience.ts                # Work experience form helpers
└── cv-work-experience-updated.spec.ts    # Work experience management tests
```

## Running Tests

### Prerequisites

1. Make sure the backend server is running (if not using the webServer configuration)
2. Ensure you have valid test user credentials in the system

### Commands

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with browser UI visible
npm run test:e2e:headed

# Run tests with slow motion (600ms delay between actions)
npm run test:e2e:slow

# Run tests with very slow motion (1000ms delay between actions)
npm run test:e2e:very-slow

# Run tests in interactive UI mode
npm run test:e2e:ui

# Debug tests step by step
npm run test:e2e:debug

# View test reports
npm run test:e2e:report
```

## Test Scenarios

### CV Work Experience Management (`cv-work-experience-updated.spec.ts`)

This test suite covers:

1. **Complete Work Experience Flow**
   - User login with improved selectors
   - Navigation to CV editor
   - Adding new work experience entry
   - Filling out all required fields using precise element targeting:
     - Job title with combobox autocomplete
     - Company name with required field validation
     - Location with keyboard navigation
     - Start and end dates with date picker
     - Job description
   - Saving changes
   - Deleting the work experience entry

2. **Keyboard Navigation Testing**
   - Tab navigation through form fields
   - Arrow key navigation in autocomplete fields
   - Enter key selection in dropdowns

3. **Form Validation**
   - Testing required field validation
   - Ensuring proper form state handling

## Configuration

The tests are configured via `playwright.config.ts` in the project root. Key settings:

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Auto-start dev server**: Yes (via webServer configuration)
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry
- **Slow Motion**: 600ms delay between actions (configurable)

### Slow Motion Options

- **Default**: 600ms delay (configured in `playwright.config.ts`)
- **Slow**: 600ms delay via `npm run test:e2e:slow`
- **Very Slow**: 1000ms delay via `npm run test:e2e:very-slow`
- **Custom**: Use environment variable `PLAYWRIGHT_LAUNCH_OPTIONS='{"slowMo":YOUR_DELAY}'`

## Test Data

The tests use the following default test user:
- Email: `mahmoud.shahrood@gmail.com`
- Password: `testpassword123`

**Note**: Ensure this user exists in your test database or update the credentials in `helpers/auth.ts`.

## Writing New Tests

When adding new E2E tests:

1. Create new `.spec.ts` files in this directory
2. Use the helper functions from `helpers/` directory
3. Follow the existing naming conventions
4. Add descriptive test names and comments
5. Use appropriate selectors (prefer role-based selectors over CSS)
6. Include proper assertions and error handling

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginUser } from './helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginUser(page);
  });

  test('should perform specific action', async ({ page }) => {
    // Test implementation
    await page.getByRole('button', { name: 'Action' }).click();
    await expect(page.getByText('Expected Result')).toBeVisible();
  });
});
```

## Debugging Tips

1. **Use headed mode** for visual debugging: `npm run test:e2e:headed`
2. **Use debug mode** to step through tests: `npm run test:e2e:debug`
3. **Check screenshots and videos** in `test-results/` after failed tests
4. **Use trace viewer** to analyze test execution: `npx playwright show-trace trace.zip`
5. **Add `page.pause()`** in tests to pause execution for manual inspection

## CI/CD Integration

The tests are integrated into the main test runner (`tests/run_tests.js`) and will run automatically as part of the comprehensive test suite.

For CI environments, tests will:
- Run with 2 retries on failure
- Use only 1 worker for stability
- Generate JUnit XML and JSON reports
- Not reuse existing dev servers

## Troubleshooting

### Common Issues

1. **Test user doesn't exist**: Update credentials in `helpers/auth.ts` or create the user in your test database
2. **Application not starting**: Ensure the dev server starts correctly and is accessible at `http://localhost:3000`
3. **Flaky tests**: Add appropriate waits for dynamic content, use `waitForLoadState()` when needed
4. **Selector not found**: Update selectors if UI has changed, prefer stable role-based selectors

### Getting Help

- Check the [Playwright documentation](https://playwright.dev/docs/intro)
- Review test output and error messages
- Use the Playwright UI mode for interactive debugging
- Check browser developer tools during headed test runs
