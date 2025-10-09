/**
 * End-to-End Test: Unsaved Changes Dialog
 * 
 * This test suite covers the unsaved changes dialog functionality in the CV editor,
 * which appears when users try to cancel editing or switch between sections/items
 * with pending changes.
 * 
 * The CV editor uses a state machine to manage editing states. When users make
 * changes and attempt to cancel or switch context, an "Unsaved Changes" dialog
 * should appear with options to "Continue Editing" or "Discard Changes".
 * 
 * Test Scenarios:
 * 1. Array section items (Education, Experience)
 * 2. Non-array sections (Professional Summary, Personal Information)
 * 3. Section-to-section switching
 * 4. Item-to-item switching (same and different sections)
 * 5. Section-to-item and item-to-section switching
 * 6. No dialog when no changes are made
 * 7. Escape key with changes
 */

import { test, expect, Page } from '@playwright/test';

// Helper function to login and navigate to CV editor
async function setupTest(page: Page): Promise<string> {
  // Navigate to login page
  await page.goto('http://localhost:3000/login');
  
  // Wait for Clerk authentication form to load
  await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 });

  // Fill in login credentials
  await page.getByLabel('Email address').fill('mahmoud.shahrud@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('pNm6h@n@q@fnHFM');

  // Click continue button
  await page.getByRole('button', { name: 'Continue' }).click();

  // Wait for navigation after login
  await page.waitForURL('**/admin', { timeout: 20000 });

  // Navigate to dashboard
  await page.getByRole('button', { name: /back to dashboard/i }).click();
  await page.waitForURL('**/dashboard');

  // Always create a new CV from scratch for testing
  const emptyStateButton = page.getByTestId('start-from-scratch-empty-state-button');
  const regularButton = page.getByTestId('start-from-scratch-button');
  
  const isEmptyState = await emptyStateButton.isVisible({ timeout: 1000 }).catch(() => false);
  if (isEmptyState) {
    await emptyStateButton.click();
  } else {
    await regularButton.click();
  }

  // Wait for CV editor to load
  await page.waitForURL(/\/cv\//, { timeout: 10000 });
  
  // Get CV ID from URL
  const cvUrl = page.url();
  const cvId = cvUrl.split('/cv/')[1];
  
  // Wait for Personal Information section (always present)
  await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible({ timeout: 10000 });
  
  // Check if we need to add sections (for new CVs) or if they already exist (existing CVs)
  const educationHeading = page.getByRole('heading', { name: 'Education' });
  const hasEducation = await educationHeading.isVisible().catch(() => false);
  
  if (!hasEducation) {
    // New CV - need to add sections
    // Add Education section
    await page.getByTestId('add-section-education-button').click();
    await expect(educationHeading).toBeVisible({ timeout: 5000 });
    
    // Add a sample Education item
    await page.getByTestId('add-new-education-button').click();
    
    // Fill Institution first (required)
    const institutionInput = page.getByRole('textbox', { name: 'Institution *' });
    await expect(institutionInput).toBeVisible();
    await institutionInput.fill('Stanford University');
    
    // Fill Degree (required) - it's a combobox
    await page.getByRole('combobox', { name: 'Degree' }).fill('PhD');
    await page.keyboard.press('Tab');
    
    // Fill Field of Study
    await page.getByRole('textbox', { name: 'Field of Study' }).fill('Computer Science');
    
    // Fill Start Date (required)
    const startDateGroup = page.getByRole('group', { name: 'Start Date *' });
    await startDateGroup.getByLabel('Day').fill('01');
    await startDateGroup.getByLabel('Month').fill('09');
    await startDateGroup.getByLabel('Year').fill('2018');
    
    // Save the education item
    const saveButton = page.getByTestId('save-education-button');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    
    // Wait for save to complete - wait for edit button to appear
    await expect(page.getByTestId('edit-education-item-0')).toBeVisible({ timeout: 5000 });
  }
  
  // Check and add Work Experience section
  const experienceHeading = page.getByRole('heading', { name: 'Work Experience' });
  const hasExperience = await experienceHeading.isVisible().catch(() => false);
  
  if (!hasExperience) {
    // Add Work Experience section
    await page.getByTestId('add-section-work_experience-button').click();
    await expect(experienceHeading).toBeVisible({ timeout: 5000 });
    
    // Add a sample Work Experience item
    await page.getByTestId('add-new-work-experience-button').click();
    
    // Fill Company (required)
    const companyInput = page.getByRole('textbox', { name: 'Company *' });
    await expect(companyInput).toBeVisible();
    await companyInput.fill('Google Inc');
    
    // Fill Position (optional)
    await page.getByRole('combobox', { name: 'Position' }).fill('Software Engineer');
    await page.keyboard.press('Tab');
    
    // Fill Start Date (required)
    const startDateGroup = page.getByRole('group', { name: 'Start Date *' });
    await startDateGroup.getByLabel('Day').fill('01');
    await startDateGroup.getByLabel('Month').fill('01');
    await startDateGroup.getByLabel('Year').fill('2020');
    
    // Save the experience item
    const saveButton = page.getByTestId('save-work-experience-button');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    
    // Wait for save to complete - wait for edit button to appear
    await expect(page.getByTestId('edit-work-experience-item-0')).toBeVisible({ timeout: 5000 });
  }
  
  // Check and add Professional Summary section
  const summaryHeading = page.getByRole('heading', { name: 'Professional Summary' });
  const hasSummary = await summaryHeading.isVisible().catch(() => false);
  
  if (!hasSummary) {
    // Add Professional Summary section
    await page.getByTestId('add-section-professional_summary-button').click();
    await expect(summaryHeading).toBeVisible({ timeout: 5000 });
  }
  
  // Scroll to top to ensure all sections are visible
  await page.evaluate(() => window.scrollTo(0, 0));
  
  // Clear console logs
  await page.evaluate(() => console.clear());
  
  return cvId;
}

// Helper function to wait for dialog to appear
async function waitForDialog(page: Page): Promise<void> {
  await expect(page.getByTestId('unsaved-changes-dialog')).toBeVisible({ timeout: 3000 });
}

// Helper function to verify dialog is NOT shown
async function verifyNoDialog(page: Page): Promise<void> {
  await expect(page.getByTestId('unsaved-changes-dialog')).not.toBeVisible({ timeout: 1000 });
}

// Helper function to add a second Education item (only needed for test #6)
async function addSecondEducationItem(page: Page): Promise<void> {
  const hasSecondItem = await page.getByTestId('edit-education-item-1').isVisible().catch(() => false);
  
  if (!hasSecondItem) {
    await page.getByTestId('add-new-education-button').click();
    
    const institutionInput = page.getByRole('textbox', { name: 'Institution *' });
    await expect(institutionInput).toBeVisible();
    await institutionInput.fill('MIT');
    
    const degreeInput = page.getByRole('combobox', { name: 'Degree' });
    await expect(degreeInput).toBeVisible();
    await degreeInput.fill('Masters');
    await page.keyboard.press('Tab');
    
    await page.getByRole('textbox', { name: 'Field of Study' }).fill('Data Science');
    
    const startDateGroup = page.getByRole('group', { name: 'Start Date *' });
    await startDateGroup.getByLabel('Day').fill('01');
    await startDateGroup.getByLabel('Month').fill('09');
    await startDateGroup.getByLabel('Year').fill('2015');
    
    const saveButton = page.getByTestId('save-education-button');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    
    await expect(page.getByTestId('edit-education-item-1')).toBeVisible({ timeout: 5000 });
  }
}

test.describe.configure({ mode: 'serial' }); // Run tests sequentially since they share a CV

test.describe('Unsaved Changes Dialog - CV Editor', () => {
  let cvId: string;
  let testPage: any; // Reuse the same page for all tests

  // Create CV once for all tests
  test.beforeAll(async ({ browser }) => {
    // Create a persistent context and page
    const context = await browser.newContext();
    testPage = await context.newPage();
    
    // Run setup to create CV - this leaves us on the CV editor page
    cvId = await setupTest(testPage);
    
    console.log(`✓ Created test CV: ${cvId} (will be reused for all tests)`);
    // Page is already on the CV editor - don't navigate away!
  });
  
  test.beforeEach(async () => {
    // Scroll to top (natural user behavior between tasks)
    await testPage.evaluate(() => window.scrollTo(0, 0));
    
    // Ensure page is ready
    await expect(testPage.getByRole('heading', { name: 'Personal Information' })).toBeVisible({ timeout: 5000 });
    await testPage.evaluate(() => console.clear());
  });
  
  test.afterEach(async () => {
    // Clean up any open dialogs (user would close before next action)
    const dialog = testPage.getByTestId('unsaved-changes-dialog');
    if (await dialog.isVisible().catch(() => false)) {
      await testPage.getByTestId('unsaved-changes-discard-button').click();
    }
  });

  test('1. Array Section Item - Education: Should show dialog when canceling with changes', async () => {
    const page = testPage;
    // Click edit icon for the first Education item
    await page.getByTestId('edit-education-item-0').click();
    
    // Wait for edit form to be visible - Degree is a combobox, not textbox
    await expect(page.getByRole('combobox', { name: 'Degree' })).toBeVisible();
    
    // Modify the Degree field
    const degreeInput = page.getByRole('combobox', { name: 'Degree' });
    await degreeInput.click();
    await degreeInput.type('X');
    
    // Click the cancel button (CancelIcon button)
    await page.locator('button:has(svg[data-testid="CancelIcon"])').first().click();
    
    // Verify "Unsaved Changes" dialog appears
    await waitForDialog(page);
    
    // Verify dialog shows "Education" section has pending changes
    const dialog = page.getByTestId('unsaved-changes-dialog');
    await expect(dialog.getByText('Education')).toBeVisible();
    await expect(dialog.getByText('Has pending changes')).toBeVisible();
    
    // Click "Discard Changes"
    await page.getByTestId('unsaved-changes-discard-button').click();
    
    // Verify form closes (edit form should not be visible)
    await expect(page.getByRole('combobox', { name: 'Degree' })).not.toBeVisible();
  });

  test('2. Array Section Item - Experience: Should allow continuing editing', async () => {
    const page = testPage;
    // Scroll to Experience section
    await page.getByRole('heading', { name: 'Work Experience' }).scrollIntoViewIfNeeded();
    
    // Click edit icon for the first Experience item
    await page.getByTestId('edit-work-experience-item-0').click();
    
    // Wait for edit form to be visible
    await expect(page.getByRole('textbox', { name: 'Company *' })).toBeVisible();
    
    // Modify the Company field
    const companyInput = page.getByRole('textbox', { name: 'Company *' });
    await companyInput.click();
    await companyInput.type('TEST');
    
    // Click the cancel button
    await page.locator('button:has(svg[data-testid="CancelIcon"])').first().click();
    
    // Verify "Unsaved Changes" dialog appears
    await waitForDialog(page);
    
    // Verify dialog shows "Work Experience" section has pending changes
    const dialog = page.getByTestId('unsaved-changes-dialog');
    await expect(dialog.getByText('Work Experience')).toBeVisible();
    
    // Click "Continue Editing"
    await page.getByTestId('unsaved-changes-continue-button').click();
    
    // Verify form stays open and "TEST" is still in Company field
    await expect(page.getByRole('textbox', { name: 'Company *' })).toBeVisible();
    const companyValue = await companyInput.inputValue();
    expect(companyValue).toContain('TEST');
    
    // Click cancel again
    await page.locator('button:has(svg[data-testid="CancelIcon"])').first().click();
    
    // This time, click "Discard Changes"
    await waitForDialog(page);
    await page.getByRole('button', { name: 'Discard Changes' }).click();
    
    // Verify form closes
    await expect(page.getByRole('textbox', { name: 'Company *' })).not.toBeVisible();
  });

  test('3. Non-Array Section - Professional Summary: Should show dialog when canceling with changes', async () => {
    const page = testPage;
    // Scroll to Professional Summary section
    await page.getByRole('heading', { name: 'Professional Summary', exact: true }).last().scrollIntoViewIfNeeded();
    
    // Click edit button using test ID
    await page.getByTestId('edit-section-professional_summary-button').click();
    
    // Wait for textarea to be visible
    const summaryTextarea = page.getByTestId('professional-summary-textarea');
    await expect(summaryTextarea).toBeVisible();
    
    // Modify the textarea
    await summaryTextarea.click();
    await summaryTextarea.type('TEST CONTENT');
    
    // Click the cancel button
    await page.locator('button:has(svg[data-testid="CancelIcon"])').first().click();
    
    // Verify "Unsaved Changes" dialog appears
    await waitForDialog(page);
    
    // Verify dialog shows "Professional Summary" has pending changes
    const dialog = page.getByTestId('unsaved-changes-dialog');
    await expect(dialog.getByText('Professional Summary')).toBeVisible();
    await expect(dialog.getByText('Has pending changes')).toBeVisible();
    
    // Click "Discard Changes"
    await page.getByTestId('unsaved-changes-discard-button').click();
    
    // Verify section edit mode closes
    await expect(page.getByTestId('professional-summary-textarea')).not.toBeVisible();
  });

  test('4. Non-Array Section - Personal Information: Should allow continuing editing', async () => {
    const page = testPage;
    // Scroll to Personal Information section
    await page.getByRole('heading', { name: 'Personal Information' }).scrollIntoViewIfNeeded();
    
    // Click edit button using test ID
    await page.getByTestId('edit-section-personal_info-button').click();
    
    // Wait for Full Name field to be visible
    const nameInput = page.getByTestId('personal-info-full-name-input');
    await expect(nameInput).toBeVisible();
    
    // Modify the Full Name field
    await nameInput.click();
    await nameInput.type('Modified');
    
    // Click the cancel button
    await page.locator('button:has(svg[data-testid="CancelIcon"])').first().click();
    
    // Verify "Unsaved Changes" dialog appears
    await waitForDialog(page);
    
    // Click "Continue Editing"
    await page.getByTestId('unsaved-changes-continue-button').click();
    
    // Verify form stays open
    await expect(page.getByTestId('personal-info-full-name-input')).toBeVisible();
    
    // Click cancel again, then "Discard Changes"
    await page.locator('button:has(svg[data-testid="CancelIcon"])').first().click();
    await waitForDialog(page);
    await page.getByTestId('unsaved-changes-discard-button').click();
    
    // Verify edit mode closes
    await expect(page.locator('button:has(svg[data-testid="CancelIcon"])')).not.toBeVisible();
  });

  test('5. Section to Section Switching: Should show dialog when switching sections with changes', async () => {
    const page = testPage;
    // Edit Professional Summary and make changes
    await page.getByRole('heading', { name: 'Professional Summary' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-section-professional_summary-button').click();
    
    const summaryTextarea = page.getByTestId('professional-summary-textarea');
    await expect(summaryTextarea).toBeVisible();
    await summaryTextarea.click();
    await summaryTextarea.type('CHANGES');
    
    // Try to edit Personal Information section
    await page.getByRole('heading', { name: 'Personal Information' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-section-personal_info-button').click();
    
    // Verify dialog appears for Professional Summary changes
    await waitForDialog(page);
    const dialog = page.getByTestId('unsaved-changes-dialog');
    await expect(dialog.getByText('Professional Summary')).toBeVisible();
    
    // Click "Discard Changes"
    await page.getByTestId('unsaved-changes-discard-button').click();
    
    // Verify Professional Summary closes and Personal Information opens
    await expect(page.getByTestId('personal-info-full-name-input')).toBeVisible();
  });

  test('6. Item to Item Switching - Same Section: Should show dialog when switching items', async () => {
    const page = testPage;
    // Add second Education item if it doesn't exist
    await addSecondEducationItem(page);
    
    // Edit first Education item and make changes
    await page.getByRole('heading', { name: 'Education' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-education-item-0').click();
    
    await expect(page.getByRole('combobox', { name: 'Degree' })).toBeVisible();
    const degreeInput = page.getByRole('combobox', { name: 'Degree' });
    await degreeInput.click();
    await degreeInput.type('MODIFIED');
    
    // Try to edit second Education item
    await page.getByTestId('edit-education-item-1').click();
    
    // Verify dialog appears for first item changes
    await waitForDialog(page);
    const dialog = page.getByTestId('unsaved-changes-dialog');
    await expect(dialog.getByText('Education')).toBeVisible();
    
    // Click "Discard Changes"
    await page.getByTestId('unsaved-changes-discard-button').click();
    
    // Verify first item closes and second item opens
    // The degree field should be visible but with different content
    await expect(page.getByRole('combobox', { name: 'Degree' })).toBeVisible();
  });

  test('7. Item to Item Switching - Different Sections: Should show dialog when switching between sections', async () => {
    const page = testPage;
    // Edit first Education item and make changes
    await page.getByRole('heading', { name: 'Education' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-education-item-0').click();
    
    await expect(page.getByRole('combobox', { name: 'Degree' })).toBeVisible();
    const degreeInput = page.getByRole('combobox', { name: 'Degree' });
    await degreeInput.click();
    await degreeInput.type('CHANGES');
    
    // Try to edit first Experience item
    await page.getByRole('heading', { name: 'Work Experience' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-work-experience-item-0').click();
    
    // Verify dialog appears for Education changes
    await waitForDialog(page);
    const dialog = page.getByTestId('unsaved-changes-dialog');
    await expect(dialog.getByText('Education')).toBeVisible();
    
    // Click "Discard Changes"
    await page.getByTestId('unsaved-changes-discard-button').click();
    
    // Verify Education item closes and Experience item opens
    await expect(page.getByRole('textbox', { name: 'Company *' })).toBeVisible();
  });

  test('8. Section to Item Switching: Should show dialog when switching from section to item', async () => {
    const page = testPage;
    // Edit Professional Summary and make changes
    await page.getByRole('heading', { name: 'Professional Summary' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-section-professional_summary-button').click();
    
    const summaryTextarea = page.getByTestId('professional-summary-textarea');
    await expect(summaryTextarea).toBeVisible();
    await summaryTextarea.click();
    await summaryTextarea.type('SECTION CHANGES');
    
    // Try to edit first Education item
    await page.getByRole('heading', { name: 'Education' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-education-item-0').click();
    
    // Verify dialog appears for Professional Summary changes
    await waitForDialog(page);
    const dialog = page.getByTestId('unsaved-changes-dialog');
    await expect(dialog.getByText('Professional Summary')).toBeVisible();
    
    // Click "Discard Changes"
    await page.getByTestId('unsaved-changes-discard-button').click();
    
    // Verify Professional Summary closes and Education item opens
    await expect(page.getByRole('combobox', { name: 'Degree' })).toBeVisible();
    
    // Close the Education form that was opened (cleanup for next test)
    await page.keyboard.press('Escape');
  });

  test('9. Item to Section Switching: Should show dialog when switching from item to section', async () => {
    const page = testPage;
    // Edit first Education item and make changes
    await page.getByRole('heading', { name: 'Education' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-education-item-0').click();
    
    await expect(page.getByRole('combobox', { name: 'Degree' })).toBeVisible();
    const degreeInput = page.getByRole('combobox', { name: 'Degree' });
    await degreeInput.click();
    await degreeInput.type('ITEM CHANGES');
    
    // Try to edit Professional Summary section
    await page.getByRole('heading', { name: 'Professional Summary' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-section-professional_summary-button').click();
    
    // Verify dialog appears for Education changes
    await waitForDialog(page);
    const dialog = page.getByTestId('unsaved-changes-dialog');
    await expect(dialog.getByText('Education')).toBeVisible();
    
    // Click "Discard Changes"
    await page.getByTestId('unsaved-changes-discard-button').click();
    
    // Verify Education item closes and Professional Summary opens
    await expect(page.getByTestId('professional-summary-textarea')).toBeVisible();
  });

  test('10. No Dialog Without Changes: Should close immediately when no changes are made', async () => {
    const page = testPage;
    // Edit first Education item
    await page.getByRole('heading', { name: 'Education' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-education-item-0').click();
    
    await expect(page.getByRole('combobox', { name: 'Degree' })).toBeVisible();
    
    // Do NOT make any changes
    
    // Click cancel button
    await page.locator('button:has(svg[data-testid="CancelIcon"])').first().click();
    
    // Verify NO dialog appears (form closes immediately)
    await verifyNoDialog(page);
    
    // Verify form is closed
    await expect(page.getByRole('combobox', { name: 'Degree' })).not.toBeVisible();
  });

  test('11. Escape Key with Changes: Should show dialog when pressing Escape with changes', async () => {
    const page = testPage;
    // Edit first Education item and make changes
    await page.getByRole('heading', { name: 'Education' }).scrollIntoViewIfNeeded();
    await page.getByTestId('edit-education-item-0').click();
    
    await expect(page.getByRole('combobox', { name: 'Degree' })).toBeVisible();
    const degreeInput = page.getByRole('combobox', { name: 'Degree' });
    await degreeInput.click();
    await degreeInput.type('ESC TEST');
    
    // Press Escape key
    await page.keyboard.press('Escape');
    
    // Verify dialog appears
    await waitForDialog(page);
    
    // Click "Continue Editing"
    await page.getByTestId('unsaved-changes-continue-button').click();
    
    // Verify form stays open
    await expect(page.getByRole('combobox', { name: 'Degree' })).toBeVisible();
    
    // Press Escape again
    await page.keyboard.press('Escape');
    
    // Verify dialog appears again
    await waitForDialog(page);
    
    // Click "Discard Changes"
    await page.getByTestId('unsaved-changes-discard-button').click();
    
    // Verify form closes
    await expect(page.getByRole('combobox', { name: 'Degree' })).not.toBeVisible();
  });

  // Cleanup: Delete the CV after all tests
  test.afterAll(async () => {
    if (!cvId || !testPage) {
      console.log('No CV ID or page to clean up');
      return;
    }
    
    try {
      // Navigate to dashboard (auth already available!)
      await testPage.goto('http://localhost:3000/dashboard');
      await expect(testPage.getByRole('heading', { name: /my cvs/i })).toBeVisible({ timeout: 5000 });
      
      // Delete the CV
      const deleteButton = testPage.getByTestId(`delete-cv-button-${cvId}`);
      if (await deleteButton.isVisible({ timeout: 3000 })) {
        await deleteButton.click();
        
        const confirmButton = testPage.getByRole('dialog').getByRole('button', { name: /delete/i });
        await expect(confirmButton).toBeVisible({ timeout: 2000 });
        await confirmButton.click();
        console.log(`✓ Successfully deleted test CV: ${cvId}`);
      } else {
        console.log(`⚠ Delete button not found for CV: ${cvId}`);
      }
    } catch (error) {
      console.log('⚠ Cleanup failed:', error);
    } finally {
      // Close context
      await testPage.context().close();
    }
  });
});

