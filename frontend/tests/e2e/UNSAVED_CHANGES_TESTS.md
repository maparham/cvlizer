# Unsaved Changes Dialog E2E Tests

## Overview

Comprehensive end-to-end test suite for the unsaved changes dialog functionality in the CV editor. This test suite ensures that users are properly warned when they attempt to navigate away from or cancel editing with unsaved changes.

## Test File

**Location**: `frontend/tests/e2e/unsaved-changes-dialog.spec.ts`

## What Was Implemented

### 1. Component Enhancements

**File**: `frontend/src/components/cv/core/UnsavedChangesDialog.tsx`

Added the following test IDs for reliable element selection:
- `unsaved-changes-dialog` - Main dialog container
- `unsaved-changes-continue-button` - Button to continue editing
- `unsaved-changes-discard-button` - Button to discard changes

### 2. Test Suite Structure

#### Helper Functions

1. **`setupTest(page: Page): Promise<string>`**
   - Handles user authentication via Clerk
   - Creates a new CV from scratch
   - Navigates to the CV editor
   - Returns the CV ID for cleanup
   - Waits for page to fully load before tests begin

2. **`waitForDialog(page: Page): Promise<void>`**
   - Waits for the unsaved changes dialog to appear
   - Uses reliable test ID selector
   - 3-second timeout for dialog appearance

3. **`verifyNoDialog(page: Page): Promise<void>`**
   - Verifies that the dialog does NOT appear
   - Used for testing scenarios where no changes were made
   - 1-second timeout (faster negative assertion)

#### Test Scenarios (11 Total)

##### 1. Array Section Item - Education (Discard Changes)
**Purpose**: Verify dialog appears when canceling Education item edits

**Steps**:
1. Click edit on first Education item
2. Modify the Degree field
3. Click cancel button
4. Verify dialog shows "Education" has pending changes
5. Click "Discard Changes"
6. Verify form closes and changes are reverted

##### 2. Array Section Item - Experience (Continue Editing)
**Purpose**: Verify users can continue editing after seeing the dialog

**Steps**:
1. Click edit on first Experience item
2. Modify the Company field with "TEST"
3. Click cancel button
4. Verify dialog shows "Work Experience" has pending changes
5. Click "Continue Editing"
6. Verify form stays open with "TEST" still present
7. Click cancel again and discard changes

##### 3. Non-Array Section - Professional Summary (Discard Changes)
**Purpose**: Verify dialog works for non-array sections

**Steps**:
1. Click "Edit this section" on Professional Summary
2. Modify the textarea
3. Click cancel button
4. Verify dialog appears
5. Click "Discard Changes"
6. Verify section closes

##### 4. Non-Array Section - Personal Information (Continue Editing)
**Purpose**: Verify continue editing works for non-array sections

**Steps**:
1. Click "Edit this section" on Personal Information
2. Modify the Full Name field
3. Click cancel button
4. Verify dialog appears
5. Click "Continue Editing"
6. Verify form stays open
7. Cancel and discard changes

##### 5. Section to Section Switching
**Purpose**: Verify dialog appears when switching between sections with changes

**Steps**:
1. Edit Professional Summary and make changes
2. Try to edit Personal Information
3. Verify dialog appears for Professional Summary changes
4. Click "Discard Changes"
5. Verify Professional Summary closes and Personal Information opens

##### 6. Item to Item Switching (Same Section)
**Purpose**: Verify dialog appears when switching between items in the same section

**Steps**:
1. Edit first Education item and make changes
2. Try to edit second Education item
3. Verify dialog appears for first item changes
4. Click "Discard Changes"
5. Verify first item closes and second item opens

##### 7. Item to Item Switching (Different Sections)
**Purpose**: Verify dialog appears when switching between items in different sections

**Steps**:
1. Edit first Education item and make changes
2. Try to edit first Experience item
3. Verify dialog appears for Education changes
4. Click "Discard Changes"
5. Verify Education item closes and Experience item opens

##### 8. Section to Item Switching
**Purpose**: Verify dialog appears when switching from section edit to item edit

**Steps**:
1. Edit Professional Summary and make changes
2. Try to edit first Education item
3. Verify dialog appears for Professional Summary changes
4. Click "Discard Changes"
5. Verify Professional Summary closes and Education item opens

##### 9. Item to Section Switching
**Purpose**: Verify dialog appears when switching from item edit to section edit

**Steps**:
1. Edit first Education item and make changes
2. Try to edit Professional Summary section
3. Verify dialog appears for Education changes
4. Click "Discard Changes"
5. Verify Education item closes and Professional Summary opens

##### 10. No Dialog Without Changes
**Purpose**: Verify NO dialog appears when no changes were made

**Steps**:
1. Edit first Education item
2. Do NOT make any changes
3. Click cancel button
4. Verify NO dialog appears
5. Verify form closes immediately

##### 11. Escape Key with Changes
**Purpose**: Verify Escape key triggers the dialog when there are changes

**Steps**:
1. Edit first Education item and make changes
2. Press Escape key
3. Verify dialog appears
4. Click "Continue Editing"
5. Press Escape again
6. Click "Discard Changes"
7. Verify form closes

### 3. Test Cleanup

The test suite includes an `afterAll` hook that:
- Deletes the created CV
- Cleans up test data
- Prevents pollution of the test database

## Running the Tests

```bash
# Run only the unsaved changes dialog tests
npx playwright test unsaved-changes-dialog.spec.ts

# Run with visible browser (headed mode)
npx playwright test unsaved-changes-dialog.spec.ts --headed

# Run with debugging
npx playwright test unsaved-changes-dialog.spec.ts --debug

# Run on specific browser
npx playwright test unsaved-changes-dialog.spec.ts --project=chromium
npx playwright test unsaved-changes-dialog.spec.ts --project=firefox
npx playwright test unsaved-changes-dialog.spec.ts --project=webkit

# Generate and view report
npx playwright test unsaved-changes-dialog.spec.ts
npx playwright show-report
```

## Expected Results

All 11 tests should pass with the following outcomes:

✅ Dialog appears ONLY when there are actual unsaved changes
✅ Dialog correctly lists all sections with pending changes
✅ "Continue Editing" keeps the form open with changes intact
✅ "Discard Changes" closes the form and reverts all changes
✅ No duplicate dialogs appear
✅ State transitions cleanly between sections and items
✅ Escape key triggers dialog appropriately
✅ No dialog when no changes were made

## Test Execution Time

Expected total execution time: **Under 30 seconds**

Each test is optimized to:
- Use explicit waits only where necessary
- Leverage Playwright's auto-waiting capabilities
- Avoid unnecessary `waitForTimeout` calls
- Run quickly without flakiness

## Element Selection Strategy

The tests use a combination of selection strategies for reliability:

1. **Test IDs** (most reliable):
   ```typescript
   page.getByTestId('edit-education-item-0')
   page.getByTestId('unsaved-changes-dialog')
   page.getByTestId('unsaved-changes-discard-button')
   ```

2. **Accessible Roles** (semantic):
   ```typescript
   page.getByRole('heading', { name: 'Education' })
   page.getByRole('textbox', { name: 'Degree *' })
   page.getByRole('button', { name: 'Continue Editing' })
   ```

3. **Icon-based Selectors** (for Material-UI icons):
   ```typescript
   page.locator('button:has(svg[data-testid="EditIcon"])')
   page.locator('button:has(svg[data-testid="CancelIcon"])')
   ```

## Debugging Tips

### If tests fail:

1. **Run in headed mode** to see what's happening:
   ```bash
   npx playwright test unsaved-changes-dialog.spec.ts --headed
   ```

2. **Use debug mode** to step through:
   ```bash
   npx playwright test unsaved-changes-dialog.spec.ts --debug
   ```

3. **Check screenshots and videos**:
   - Located in `test-results/` directory
   - Automatically captured on failure

4. **Add breakpoints** in the test code:
   ```typescript
   await page.pause(); // Pauses execution
   ```

5. **Check console logs**:
   ```typescript
   page.on('console', msg => console.log(msg.text()));
   ```

## Known Considerations

### Authentication
- Tests use a test account: `mahmoud.shahrud@gmail.com`
- Account must have proper permissions
- Clerk authentication takes ~2 seconds to load

### Timing
- SlowMo is set to 600ms in playwright.config.ts
- This ensures actions are visible and UI has time to respond
- Can be adjusted if tests are too slow

### Browser Support
- Tests run on Chromium, Firefox, and WebKit
- All three browsers are tested in CI/CD
- Behavior should be consistent across browsers

### Test Isolation
- Each test creates its own CV
- Tests can run in parallel
- Cleanup ensures no database pollution

## Future Enhancements

Potential additions to the test suite:

1. **Multiple Simultaneous Changes**:
   - Test dialog when multiple sections have pending changes
   - Verify all changed sections are listed

2. **Navigation Events**:
   - Test browser back button with unsaved changes
   - Test clicking dashboard link with unsaved changes

3. **Auto-save Integration**:
   - Test interaction with auto-save functionality
   - Verify changes persist after dialog dismissal

4. **Error Scenarios**:
   - Test dialog when save operation fails
   - Test dialog with network errors

5. **Accessibility Testing**:
   - Test keyboard navigation through dialog
   - Test screen reader announcements
   - Test focus management

## Success Criteria

✅ All 11 test scenarios pass reliably
✅ Tests run quickly (under 30 seconds total)
✅ No flaky tests or race conditions
✅ Clear assertions for each expected behavior
✅ Proper cleanup between tests
✅ Comprehensive coverage of all state transitions

## Documentation Updates

The following documentation was updated:

1. **`frontend/tests/e2e/README.md`**:
   - Added unsaved changes dialog test coverage
   - Updated test ID documentation
   - Added test structure information

2. **This file** (`UNSAVED_CHANGES_TESTS.md`):
   - Comprehensive guide to the test suite
   - Running instructions
   - Debugging tips
   - Future enhancement ideas

## Component Changes

**Modified**: `frontend/src/components/cv/core/UnsavedChangesDialog.tsx`

Changes made:
- Added `data-testid="unsaved-changes-dialog"` to Dialog component
- Added `data-testid="unsaved-changes-continue-button"` to Continue button
- Added `data-testid="unsaved-changes-discard-button"` to Discard button

These changes:
- ✅ Improve testability
- ✅ Follow existing test ID conventions
- ✅ Don't affect functionality
- ✅ Enable reliable element selection
- ✅ Are non-breaking changes
