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
    console.log('🔍 Step 1: Clicking Sign In button');
    // await page.pause(); // Pause before login
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Fill in login credentials using more specific selectors
    console.log('🔍 Filling email address');
    // await page.pause(); // Pause before email
    await page.getByRole('textbox', { name: 'Email Address' }).fill('mahmoud.shahrood@gmail.com');
    
    console.log('🔍 Filling password');
    // await page.pause(); // Pause before password
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('testpassword123');
    
    // Submit login form
    console.log('🔍 Submitting login form');
    // await page.pause(); // Pause before submit
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Step 2: Navigate to CV Editor
    console.log('🔍 Step 2: Navigating to CV Editor');
    // await page.pause(); // Pause before navigation
    await page.getByRole('button', { name: 'Edit' }).click();

    // Step 3: Add new work experience
    console.log('🔍 Step 3: Adding new work experience');
    // await page.pause(); // Pause before adding
    await page.getByLabel('Add new work experience').getByRole('button').click();

    // Step 4: Fill out work experience details with updated selectors
    
    // Job title with autocomplete - using combobox role
    console.log('🔍 Filling job position');
    // await page.pause(); // Pause before position
    await page.getByRole('combobox', { name: 'Position' }).fill('so');
    
    console.log('🔍 Selecting autocomplete option');
    // await page.pause(); // Pause before selection
    await page.getByRole('option', { name: 'Software Engineer', exact: true }).click();
    
    // Company name - using more specific textbox selector
    console.log('🔍 Filling company name');
    // await page.pause(); // Pause before company
    await page.getByRole('textbox', { name: 'Company *' }).click();
    await page.getByRole('textbox', { name: 'Company *' }).fill('XXX');
    await page.getByRole('textbox', { name: 'Company *' }).press('Tab');
    
    // Location with autocomplete - using combobox and keyboard navigation
    console.log('🔍 Filling location with keyboard navigation');
    // await page.pause(); // Pause before location
    await page.getByRole('combobox', { name: 'Location' }).fill('Ber');
    await page.getByRole('combobox', { name: 'Location' }).press('ArrowDown');
    await page.getByRole('combobox', { name: 'Location' }).press('Enter');
    await page.getByRole('combobox', { name: 'Location' }).press('Tab');

    // Start date - using group selector for better organization
    console.log('🔍 Filling start date');
    // await page.pause(); // Pause before start date
    await page.getByRole('group', { name: 'Start Date *' }).getByLabel('Day').fill('01');
    await page.getByRole('group', { name: 'Start Date *' }).getByLabel('Month').fill('01');
    await page.getByRole('group', { name: 'Start Date *' }).getByLabel('Year').fill('2022');

    // End date using more specific CSS selector for the date picker button
    console.log('🔍 Opening end date picker');
    // await page.pause(); // Pause before date picker
    await page.locator('.MuiBox-root.css-10egq61 > div:nth-child(2) > .MuiButtonBase-root').click();
    
    console.log('🔍 Selecting end date');
    // await page.pause(); // Pause before date selection
    await page.getByRole('gridcell', { name: '16' }).click();

    // Job description - using textbox role
    console.log('🔍 Filling job description');
    // await page.pause(); // Pause before description
    await page.getByRole('textbox', { name: 'Description' }).click();
    await page.getByRole('textbox', { name: 'Description' }).fill('None');

    // Step 5: Save the work experience
    console.log('🔍 Step 5: Saving work experience');
    // await page.pause(); // Pause before save
    await page.getByLabel('Save changes').getByRole('button').click();

    // Step 6: Verify the work experience entry appears
    console.log('🔍 Step 6: Verifying work experience entry appears');
    // await page.pause(); // Pause before verification
    await expect(page.locator('div').filter({ hasText: /^Software EngineerXXX2022-01-01 - 2025-09-16None$/ }).first()).toBeVisible();

    // Step 7: Delete the work experience entry using the specific delete button selector
    console.log('🔍 Step 7: Deleting work experience');
    // await page.pause(); // Pause before delete
    await page.locator('div:nth-child(6) > .MuiBox-root.css-0 > .MuiBox-root > .MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall.item-delete-button').click();
    
    console.log('🔍 Test completed!');
    // await page.pause(); // Final pause to see result
  });

});

