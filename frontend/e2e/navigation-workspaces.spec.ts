import { test, expect } from '@playwright/test';

test.describe('JobGraph Sidebar Navigation & Workspaces E2E', () => {
  test('navigates cleanly across all sidebar routes, performs CRUD, and focuses graph', async ({ page }) => {
    // 1. Navigate to application root
    await page.goto('/');

    // Handle login if present
    const signInBtn = page.getByRole('button', { name: /Sign In to Dashboard/i });
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
    }

    // 2. Verify Dashboard Graph route
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=JobGraph').first()).toBeVisible({ timeout: 10000 });

    // 3. Click Companies
    const companiesNav = page.getByRole('button', { name: /Companies/i }).first();
    await companiesNav.click();
    await expect(page).toHaveURL(/\/companies/);
    await expect(page.locator('h1:has-text("Companies")')).toBeVisible();

    // 4. Click Add Company
    const addCompBtn = page.getByRole('button', { name: /\+ Add Company/i }).first();
    await addCompBtn.click();
    await expect(page.locator('text=Add New Company')).toBeVisible();

    // Fill form
    await page.fill('input[placeholder*="Zoho"]', 'Test Dynamics Inc');
    await page.click('button:has-text("Create Company")');
    await expect(page.locator('text=Test Dynamics Inc')).toBeVisible();

    // 5. Click Focus Graph on Company
    const focusCompBtn = page.getByRole('button', { name: /Focus Graph/i }).first();
    await focusCompBtn.click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 6. Click People Network
    const peopleNav = page.getByRole('button', { name: /People Network/i }).first();
    await peopleNav.click();
    await expect(page).toHaveURL(/\/people/);
    await expect(page.locator('h1:has-text("People Network")')).toBeVisible();

    // 7. Click Settings
    const settingsNav = page.getByRole('button', { name: /Settings/i }).first();
    await settingsNav.click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();

    // Test Settings tabs
    await page.getByRole('button', { name: /Notifications/i }).click();
    await expect(page.locator('text=Notification Preferences')).toBeVisible();

    await page.getByRole('button', { name: /Data & Privacy/i }).click();
    await expect(page.locator('text=Export My Data')).toBeVisible();
  });
});
