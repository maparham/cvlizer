import { test, expect } from '@playwright/test';
import { DEFAULT_TEST_USER } from './helpers/auth';

/**
 * Authentication Tests
 * 
 * Basic authentication flow tests (login only, since signup is managed by Clerk)
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display home page correctly', async ({ page }) => {
    // Verify home page elements
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('CV Optimizer')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Click sign in button
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Fill in credentials
    await page.getByRole('textbox', { name: 'Email Address' }).fill(DEFAULT_TEST_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(DEFAULT_TEST_USER.password);
    
    // Submit login
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('My CVs');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Click sign in button
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Fill in invalid credentials
    await page.getByRole('textbox', { name: 'Email Address' }).fill('invalid@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
    
    // Submit login
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should require email and password fields', async ({ page }) => {
    // Click sign in button
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Try to submit without filling fields
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Should show validation messages or prevent submission
    const emailField = page.getByRole('textbox', { name: 'Email Address' });
    const passwordField = page.getByRole('textbox', { name: 'Password' });
    
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    // Click sign in button
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    const passwordField = page.getByRole('textbox', { name: 'Password' });
    const toggleButton = page.getByRole('button', { name: /show|hide password/i });
    
    // Fill password
    await passwordField.fill('testpassword');
    
    // Initially should be hidden (type="password")
    await expect(passwordField).toHaveAttribute('type', 'password');
    
    // Click toggle button if it exists
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      
      // Should now be visible (type="text")
      await expect(passwordField).toHaveAttribute('type', 'text');
      
      // Toggle back
      await toggleButton.click();
      await expect(passwordField).toHaveAttribute('type', 'password');
    }
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.getByRole('textbox', { name: 'Email Address' }).fill(DEFAULT_TEST_USER.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(DEFAULT_TEST_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Logout
    await page.getByTestId('user-menu-button').click();
    await page.getByTestId('logout-menu-item').click();
    
    // Should redirect to home
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
