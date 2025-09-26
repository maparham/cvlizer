import { test, expect } from '@playwright/test';

/**
 * E2E Test: CV Work Experience Management (Updated Version)
 * 
 * This test covers the complete user flow for managing work experience entries in a CV
 * using the updated selectors and interactions recorded from the actual application.
 * 
 * Test Flow:
 * 1. User authentication (login)
 * 2. Navigation to CV editor
 * 3. Adding a new work experience entry
 * 4. Filling out work experience details with improved selectors
 * 5. Saving the changes
 * 6. Deleting the work experience entry
 */

test.describe('CV Work Experience Management (Updated)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should allow user to add, save, and delete work experience with updated selectors', async ({ page }) => {
    // Step 1: Sign in
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Fill in login credentials using more specific selectors
    await page.getByRole('textbox', { name: 'Email Address' }).fill('mahmoud.shahrood@gmail.com');
    
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('testpassword123');
    
    // Submit login form
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Step 2: Navigate to CV Editor
    await page.getByRole('button', { name: 'Edit' }).click();

    // Step 3: Add new work experience
    await page.getByLabel('Add new work experience').getByRole('button').click();

    // Step 4: Fill out work experience details with updated selectors
    
    // Job title with autocomplete - using combobox role
    await page.getByRole('combobox', { name: 'Position' }).fill('so');
    await page.getByRole('option', { name: 'Software Engineer', exact: true }).click();
    
    // Company name - using more specific textbox selector
    await page.getByRole('textbox', { name: 'Company *' }).click();
    await page.getByRole('textbox', { name: 'Company *' }).fill('XXX');
    await page.getByRole('textbox', { name: 'Company *' }).press('Tab');
    
    // Location with autocomplete - using combobox and keyboard navigation
    await page.getByRole('combobox', { name: 'Location' }).fill('Ber');
    await page.getByRole('combobox', { name: 'Location' }).press('ArrowDown');
    await page.getByRole('combobox', { name: 'Location' }).press('Enter');
    await page.getByRole('combobox', { name: 'Location' }).press('Tab');

    // Start date - using group selector for better organization
    await page.getByRole('group', { name: 'Start Date *' }).getByLabel('Day').fill('01');
    await page.getByRole('group', { name: 'Start Date *' }).getByLabel('Month').fill('01');
    await page.getByRole('group', { name: 'Start Date *' }).getByLabel('Year').fill('2022');

    // End date using more specific CSS selector for the date picker button
    await page.locator('.MuiBox-root.css-10egq61 > div:nth-child(2) > .MuiButtonBase-root').click();
    await page.getByRole('gridcell', { name: '16' }).click();

    // Job description - using textbox role
    await page.getByRole('textbox', { name: 'Description' }).click();
    await page.getByRole('textbox', { name: 'Description' }).fill('None');

    // Step 5: Save the work experience
    await page.getByLabel('Save changes').getByRole('button').click();

    // Step 6: Verify the work experience entry appears
    await expect(page.locator('div').filter({ hasText: /^Software EngineerXXX2022-01-01 - 2025-09-16None$/ }).first()).toBeVisible();

    // Step 7: Delete the work experience entry using the specific delete button selector
    await page.locator('div:nth-child(6) > .MuiBox-root.css-0 > .MuiBox-root > .MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall.item-delete-button').click();
  });

});

