import { test, expect } from '@playwright/test';

test.describe('JobGraph Phase 3 - Complete AI Command & Graph Workflow E2E', () => {
  test('opens command palette via button & shortcut, queries AI, highlights graph, and confirms mutation', async ({ page }) => {
    // 1. Navigate to local JobGraph app
    await page.goto('/');

    // Check if on Login Page and authenticates if needed
    const signInButton = page.getByRole('button', { name: /Sign In to Dashboard/i });
    if (await signInButton.isVisible()) {
      await signInButton.click();
    }

    // 2. Ensure dashboard & header loaded
    await expect(page.locator('text=JobGraph').first()).toBeVisible({ timeout: 10000 });

    // 3. Verify "Ask JobGraph" control in header opens command palette
    const askButton = page.getByRole('button', { name: /Ask JobGraph/i });
    await expect(askButton).toBeVisible();
    await askButton.click();

    // 4. Verify modal visible with input placeholder
    const commandInput = page.getByPlaceholder(/Ask JobGraph anything/i);
    await expect(commandInput).toBeVisible();

    // 5. Press Escape to close modal
    await page.keyboard.press('Escape');
    await expect(commandInput).not.toBeVisible();

    // 6. Open via Control+k keyboard shortcut
    await page.keyboard.press('Control+k');
    await expect(commandInput).toBeVisible();

    // 7. Submit an AI query
    await commandInput.fill('Show people from Zoho');
    await page.keyboard.press('Enter');

    // 8. Palette closes, AI result drawer appears with response text
    await expect(commandInput).not.toBeVisible();
    await expect(page.locator('text=AI Graph Assistant')).toBeVisible();

    // 9. Verify React Flow graph canvas elements exist
    const reactFlowCanvas = page.locator('.react-flow');
    await expect(reactFlowCanvas).toBeVisible();

    // 10. Open shortcut Control+k again to execute a mutation query
    await page.keyboard.press('Control+k');
    await expect(commandInput).toBeVisible();
    await commandInput.fill('Mark Suresh as willing to refer me');
    await page.keyboard.press('Enter');

    // 11. Verify Mutation Confirmation UI appears
    await expect(page.locator('text=Mutation Confirmation Required')).toBeVisible();
    const confirmButton = page.getByRole('button', { name: /Confirm Action/i });
    await expect(confirmButton).toBeVisible();
  });
});
