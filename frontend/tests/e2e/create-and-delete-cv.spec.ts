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

import { test, expect } from '@playwright/test';

test.describe('Create and Delete CV Workflow', () => {
  test('should create a minimal CV and then delete it', async ({ page }) => {
    // Step 1: Navigate to the application
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/CV Optimizer/);

    // Step 2: Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Wait for Clerk authentication form to load
    await page.waitForTimeout(2000);

    // Step 3: Fill in login credentials using Clerk's accessible labels
    await page.getByLabel('Email address').fill('mahmoud.shahrud@gmail.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('pNm6h@n@q@fnHFM');

    // Wait a moment for Clerk to process the input
    await page.waitForTimeout(1000);

    // Step 4: Click continue button
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for navigation after login - test user is admin so goes to /admin
    await page.waitForURL('**/admin', { timeout: 20000 });

    // Step 5: Navigate to dashboard from admin
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.waitForURL('**/dashboard');

    // Step 6: Start creating a new CV from scratch
    await page.getByTestId('start-from-scratch-button').click();

    // Wait for CV editor to load
    await page.waitForURL(/\/cv\//, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();

    // Step 7: Edit Personal Information section
    await page.getByRole('button', { name: /edit this section/i }).first().click();

    // Fill in personal information
    await page.getByRole('textbox', { name: /your name/i }).fill('John Smith');
    await page.getByRole('textbox', { name: /email/i }).fill('john.smith@example.com');
    await page.getByRole('textbox', { name: /phone/i }).fill('+1 234 567 8900');
    await page.getByRole('combobox', { name: /location/i }).fill('New York, NY');

    // Save personal information - click the save icon button
    await page.waitForTimeout(500);
    await page.locator('button:has(svg[data-testid="SaveIcon"])').first().click();

    // Wait for success message
    await expect(page.getByText(/personal information saved/i)).toBeVisible({ timeout: 5000 });

    // Step 8: Add Professional Summary section
    await page.getByRole('button', { name: /add this section to your cv/i }).first().click();
    
    // Wait for section to be added
    await expect(page.getByText(/professional summary section added/i)).toBeVisible({ timeout: 5000 });

    // Edit Professional Summary
    await page.getByRole('button', { name: /edit this section/i }).nth(1).click();

    // Fill in professional summary
    const summaryText = 'Experienced professional with a strong track record in delivering high-quality results. Passionate about continuous learning and applying innovative solutions to complex challenges.';
    await page.getByRole('textbox', { name: /your professional summary/i }).fill(summaryText);

    // Save professional summary - click the save icon button
    await page.waitForTimeout(500);
    await page.locator('button:has(svg[data-testid="SaveIcon"])').first().click();

    // Wait for success message
    await expect(page.getByText(/professional summary saved/i)).toBeVisible({ timeout: 5000 });

    // Step 9: Add Skills section
    const addButtons = page.getByRole('button', { name: /add this section to your cv/i });
    await addButtons.nth(3).click(); // Skills section

    // Wait for section to be added
    await expect(page.getByText(/skills section added/i)).toBeVisible({ timeout: 5000 });

    // Edit Skills section
    await page.getByRole('button', { name: /edit this section/i }).nth(2).click();

    // Add technical skills
    await page.getByRole('button', { name: 'Python', exact: true }).click();
    await expect(page.getByText(/technical skill added/i)).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: 'JavaScript', exact: true }).click();
    await expect(page.getByText(/technical skill added/i)).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: 'TypeScript', exact: true }).click();
    await expect(page.getByText(/technical skill added/i)).toBeVisible({ timeout: 3000 });

    // Add soft skills
    await page.getByRole('button', { name: 'Communication', exact: true }).click();
    await expect(page.getByText(/soft skill added/i)).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: 'Leadership', exact: true }).click();
    await expect(page.getByText(/soft skill added/i)).toBeVisible({ timeout: 3000 });

    // Close skills editor
    await page.getByRole('button', { name: /cancel editing/i }).click();

    // Verify skills are displayed
    await expect(page.getByText('Python')).toBeVisible();
    await expect(page.getByText('JavaScript')).toBeVisible();
    await expect(page.getByText('TypeScript')).toBeVisible();
    await expect(page.getByText('Communication')).toBeVisible();
    await expect(page.getByText('Leadership')).toBeVisible();

    // Get the CV ID from URL for later verification
    const cvUrl = page.url();
    const cvId = cvUrl.split('/cv/')[1];
    expect(cvId).toBeTruthy();

    // Step 10: Navigate back to dashboard
    await page.getByTestId('cv-editor-back-button').click();
    await page.waitForURL('**/dashboard');

    // Verify we're on the dashboard
    await expect(page.getByRole('heading', { name: /my cvs/i })).toBeVisible();

    // Step 11: Find and delete the newly created CV
    // The CV should be visible on the dashboard
    await expect(page.getByText(/New CV 2\.pdf/i)).toBeVisible();

    // Click the delete button for the new CV
    await page.getByTestId(`delete-cv-button-${cvId}`).click();

    // Confirm deletion in dialog
    await expect(page.getByRole('dialog', { name: /delete cv/i })).toBeVisible();
    await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();

    // Click the delete button in the dialog
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();

    // Wait for success message
    await expect(page.getByText(/deleted successfully/i)).toBeVisible({ timeout: 5000 });

    // Verify the CV is no longer in the list
    await expect(page.getByText(/New CV 2\.pdf/i)).not.toBeVisible({ timeout: 5000 });
  });
});

