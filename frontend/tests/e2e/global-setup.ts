/**
 * Global Setup for E2E Tests
 * 
 * This module performs one-time authentication before all tests run,
 * saving authenticated session states for multiple users. This eliminates 
 * the need for each test to login separately and supports parallel test 
 * execution with separate user accounts to prevent data conflicts.
 * 
 * The authentication states are saved to .auth/user1.json and .auth/user2.json
 * and dynamically assigned to workers via fixtures.
 */
import { chromium, FullConfig } from '@playwright/test';
import { TEST_USERS } from './test-constants';

async function globalSetup(config: FullConfig) {
  console.log('🔐 Setting up global authentication for multiple users...');
  
  const browser = await chromium.launch();
  
  try {
    // Authenticate each test user
    for (let i = 0; i < TEST_USERS.length; i++) {
      const user = TEST_USERS[i];
      const userNum = i + 1;
      
      console.log(`  Authenticating user ${userNum}: ${user.email}`);
      
      const page = await browser.newPage();
      
      try {
        // Login
        await page.goto('http://localhost:3000/login');
        await page.getByLabel('Email address').fill(user.email);
        await page.getByRole('textbox', { name: 'Password' }).fill(user.password);
        await page.getByRole('button', { name: 'Continue' }).click();
        
        // Wait for successful login (redirects to dashboard or admin)
        await page.waitForURL(/\/(dashboard|admin)/, { timeout: 20000 });
        
        // Save authentication state to separate file for this user
        await page.context().storageState({ path: `tests/e2e/.auth/user${userNum}.json` });
        
        console.log(`  ✅ User ${userNum} authenticated`);
      } finally {
        await page.close();
      }
    }
    
    console.log('✅ All authentication states saved');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

