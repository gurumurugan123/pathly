import { test, expect } from '@playwright/test';

test.describe('JobGraph Phase 4 - Career Intelligence & Recommendations E2E', () => {
  test('navigates to dashboard, interacts with Daily Brief modal, opens Needs Attention sheet, and toggles graph modes', async ({ page }) => {
    // 1. Navigate to application
    await page.goto('/');

    // Handle authentication if needed
    const signInBtn = page.getByRole('button', { name: /Sign In to Dashboard/i });
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
    }

    // 2. Ensure Dashboard loaded and graph canvas present
    await expect(page.locator('text=JobGraph').first()).toBeVisible({ timeout: 10000 });
    
    // 3. Click ✦ Career Brief in header to open modal on-demand
    const briefBtn = page.getByRole('button', { name: /✦ Career Brief/i });
    await expect(briefBtn).toBeVisible();
    await briefBtn.click();

    // Verify Daily Intelligence Brief modal appears
    await expect(page.locator('text=Daily Intelligence Brief').first()).toBeVisible();

    // 4. Open "Needs Attention" Insight Drawer via Review button
    const reviewBtn = page.getByRole('button', { name: /Review Recommendations/i }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // 5. Verify Needs Attention sheet opened
    await expect(page.locator('text=Needs Attention').first()).toBeVisible();
    await expect(page.locator('text=Why this recommendation?').first()).toBeVisible();

    // Click "Why this recommendation?" to inspect explainable data
    await page.locator('text=Why this recommendation?').first().click();
    await expect(page.locator('text=View Data').first()).toBeVisible();

    // Close Insight Sheet via Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Needs Attention').first()).not.toBeVisible();

    // 6. Test Graph Mode Toolbar dropdown
    const modeTrigger = page.getByRole('button', { name: /Mode:/i });
    await expect(modeTrigger).toBeVisible();
    await modeTrigger.click();

    const modeOption = page.getByRole('button', { name: /Referral Opportunities/i });
    await expect(modeOption).toBeVisible();
    await modeOption.click();

    // 7. Test Notifications Bell Control
    const notifBtn = page.getByTitle('Notifications');
    await expect(notifBtn).toBeVisible();
    await notifBtn.click();

    await expect(page.locator('text=Notifications').first()).toBeVisible();
  });
});
