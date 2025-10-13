/**
 * End-to-End Test: Create and Delete CV
 *
 * This test covers the complete workflow of:
 * 1. User login with Clerk authentication
 * 2. Creating a new CV from scratch
 * 3. Adding and editing CV sections (Personal Info, Professional Summary, Skills)
 * 4. Navigating back to dashboard
 * 5. Deleting the created CV
 */

import { test, expect } from './fixtures';
import { TEST_TIMEOUT, VALIDATION_WAIT, DASHBOARD_REFRESH_TIMEOUT } from './test-constants';

test.describe('Create and Delete CV Workflow', () => {
  test('should create a minimal CV and then delete it', async ({ page, testUser }) => {
    // Authentication handled by global-setup.ts - user already logged in
    // Navigate to root (admin users redirect to /admin, then go to dashboard)
    await page.goto('/');

    const url = page.url();
    if (url.includes('/admin')) {
      await page.getByRole('button', { name: /back to dashboard/i }).click();
      await page.waitForURL('**/dashboard');
    } else if (!url.includes('/dashboard')) {
      await page.goto('/dashboard');
    }

    await expect(page.getByRole('heading', { name: /my cvs/i })).toBeVisible();

    // Start creating a new CV from scratch
    await page.getByRole('button', { name: /start from scratch/i }).click();

    // Wait for CV editor to load
    await page.waitForURL(/\/cv\//, { timeout: TEST_TIMEOUT });
    await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();

    // Step 7: Edit Personal Information section
    await page.getByTestId('edit-section-personal_info-button').click();

    // Wait for form to render by checking for first input
    const nameInput = page.getByTestId('personal-info-full-name-input').locator('input');
    await expect(nameInput).toBeVisible({ timeout: TEST_TIMEOUT });

    // Fill in all required personal information fields
    await nameInput.click();
    await page.getByTestId('personal-info-full-name-input').locator('input').fill(testUser.displayName);

    await page.getByTestId('personal-info-email-input').locator('input').click();
    await page.getByTestId('personal-info-email-input').locator('input').fill(testUser.email);

    await page.getByTestId('personal-info-phone-input').locator('input').click();
    await page.getByTestId('personal-info-phone-input').locator('input').fill('+1 234 567 8900');

    await page.getByRole('combobox', { name: /location/i }).click();
    await page.getByRole('combobox', { name: /location/i }).fill('New York, NY');
    await page.keyboard.press('Tab'); // Close autocomplete
    await page.waitForTimeout(VALIDATION_WAIT);

    // Save personal information - click the save icon button
    const saveButton = page.locator('button:has(svg[data-testid="SaveIcon"])').first();
    await expect(saveButton).toBeEnabled({ timeout: TEST_TIMEOUT });

    // Capture temp CV ID before save
    const tempCvId = page.url().split('/cv/')[1];
    await saveButton.click();

    // Wait for navigation from temp ID to real UUID (happens after first save)
    // The navigation itself indicates success
    await page.waitForURL((url) => url.pathname.includes('/cv/') && !url.pathname.includes(tempCvId), { timeout: TEST_TIMEOUT });

    // Step 8: Add Professional Summary section
    await page.getByRole('button', { name: /add this section to your cv/i }).first().click();

    // Wait for section to be added
    await expect(page.getByText(/professional summary section added/i)).toBeVisible({ timeout: TEST_TIMEOUT });

    // Edit Professional Summary
    await page.getByRole('button', { name: /edit this section/i }).nth(1).click();

    // Fill in professional summary
    const summaryText = 'Experienced professional with a strong track record in delivering high-quality results. Passionate about continuous learning and applying innovative solutions to complex challenges.';
    await page.getByRole('textbox', { name: /your professional summary/i }).fill(summaryText);

    // Save professional summary - wait for save button to be enabled
    const summaryButton = page.locator('button:has(svg[data-testid="SaveIcon"])').first();
    await expect(summaryButton).toBeEnabled({ timeout: TEST_TIMEOUT });
    await summaryButton.click();

    // Wait for success message
    await expect(page.getByText(/professional summary saved/i)).toBeVisible({ timeout: TEST_TIMEOUT });

    // Step 9: Add Skills section
    const addButtons = page.getByRole('button', { name: /add this section to your cv/i });
    await addButtons.nth(3).click(); // Skills section

    // Wait for section to be added
    await expect(page.getByText(/skills section added/i)).toBeVisible({ timeout: TEST_TIMEOUT });

    // Edit Skills section
    await page.getByRole('button', { name: /edit this section/i }).nth(2).click();

    // Add technical skills
    await page.getByRole('button', { name: 'Python', exact: true }).click();
    await expect(page.getByText(/technical skill added/i)).toBeVisible({ timeout: TEST_TIMEOUT });

    await page.getByRole('button', { name: 'JavaScript', exact: true }).click();
    await expect(page.getByText(/technical skill added/i)).toBeVisible({ timeout: TEST_TIMEOUT });

    await page.getByRole('button', { name: 'TypeScript', exact: true }).click();
    await expect(page.getByText(/technical skill added/i)).toBeVisible({ timeout: TEST_TIMEOUT });

    // Add soft skills
    await page.getByRole('button', { name: 'Communication', exact: true }).click();
    await expect(page.getByText(/soft skill added/i)).toBeVisible({ timeout: TEST_TIMEOUT });

    await page.getByRole('button', { name: 'Leadership', exact: true }).click();
    await expect(page.getByText(/soft skill added/i)).toBeVisible({ timeout: TEST_TIMEOUT });

    // Close skills editor
    await page.getByRole('button', { name: /cancel editing/i }).click();

    // Verify skills are displayed
    await expect(page.getByText('Python')).toBeVisible();
    await expect(page.getByText('JavaScript')).toBeVisible();
    await expect(page.getByText('TypeScript')).toBeVisible();
    await expect(page.getByText('Communication')).toBeVisible();
    await expect(page.getByText('Leadership')).toBeVisible();

    // Get the REAL CV ID from URL (after temp→real conversion)
    const cvUrl = page.url();
    const cvId = cvUrl.split('/cv/')[1];
    expect(cvId).toBeTruthy();
    expect(cvId).not.toContain('temp-'); // Verify it's a real UUID, not temp

    // Step 10: Navigate back to dashboard
    await page.getByTestId('cv-editor-back-button').click();
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: /my cvs/i })).toBeVisible();

    // The CV should already be in the Zustand store from the save operation
    // Wait for CV cards to render (the CV was added to store.cvs during saveTemporaryCV)
    await expect(page.getByTestId(`edit-cv-button-${cvId}`)).toBeVisible({ timeout: DASHBOARD_REFRESH_TIMEOUT });

    // Step 11: Find and delete the newly created CV using real CV ID
    await expect(page.getByTestId(`delete-cv-button-${cvId}`)).toBeVisible({ timeout: TEST_TIMEOUT });

    // Click the delete button for the new CV
    await page.getByTestId(`delete-cv-button-${cvId}`).click();

    // Confirm deletion in dialog
    await expect(page.getByRole('dialog', { name: /delete cv/i })).toBeVisible();
    await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();

    // Click the delete button in the dialog
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();

    // Wait for success message
    await expect(page.getByText(/deleted successfully/i)).toBeVisible({ timeout: TEST_TIMEOUT });

    // Wait for the CV card to be removed from the dashboard (delete button should disappear)
    await expect(page.getByTestId(`delete-cv-button-${cvId}`)).not.toBeVisible({ timeout: TEST_TIMEOUT });
  });
});
