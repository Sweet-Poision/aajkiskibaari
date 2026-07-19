import { test, expect } from '@playwright/test';

// Use a unique flat ID for each test run to prevent state collision
const testFlatId = `test-flat-${Date.now()}`;

test.describe('AajKiskiBari E2E', () => {
  test('should create a flat, add a member, and navigate to dashboard', async ({ page }) => {
    // 1. Visit Home
    await page.goto('http://localhost:3000/');
    
    // Check if we are redirected to /login (because no session cookie)
    await expect(page).toHaveURL(/.*login/);
    
    // 2. Register a flat
    await page.click('button:has-text("Register")');
    await page.fill('input[placeholder="e.g. flat-4b"]', testFlatId);
    
    // Fill out password if required in the future, for now it's just the flat ID
    await page.click('button:has-text("Create Flat")');
    
    // Next, it should redirect to /profiles
    await expect(page).toHaveURL(/.*profiles/);
    
    // 3. Add a Member Profile
    await page.click('button:has-text("Add Member")');
    const memberName = "TestUser";
    await page.fill('input[placeholder="e.g. Shashi"]', memberName);
    await page.click('button:has-text("Save Profile")');
    
    // Wait for the new profile box to appear
    await expect(page.locator(`text=${memberName}`)).toBeVisible();
    
    // 4. Login to Profile (Click the avatar)
    await page.click(`button:has-text("${memberName}")`);
    
    // Should navigate to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // 5. Verify Dashboard Elements
    await expect(page.locator('h1', { hasText: 'Overview' })).toBeVisible();
    await expect(page.locator(`text=${testFlatId}`)).toBeVisible(); // Flat session ID in header
  });
});
