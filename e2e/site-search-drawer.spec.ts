import {expect, Page, test} from '@playwright/test';

async function openSearchDrawer(page: Page): Promise<void> {
  // The compact header uses one always-visible search trigger at every width.
  // Focusing it opens the same drawer without coupling the test to menu layout.
  await page.getByRole('searchbox', {name: 'Search posts'}).focus();
}

test.describe('site search drawer', () => {
  test('opens above page content and renders visual quick results', async ({page}) => {
    test.setTimeout(60_000);
    await page.goto('/');

    await openSearchDrawer(page);

    const dialog = page.getByRole('dialog', {name: 'Find posts and pages'});
    const resultsPanel = page.locator('#site-search-results-panel');
    await expect(dialog).toBeVisible();
    await expect(resultsPanel).toBeVisible();
    const expectedPosition = (page.viewportSize()?.width ?? 0) >= 640 ? 'absolute' : 'fixed';
    await expect(resultsPanel).toHaveCSS('position', expectedPosition);

    await page.getByRole('searchbox', {name: 'Search posts'}).fill('architecture');

    const quickResults = resultsPanel.locator('a.site-search-quick-result');
    await expect(quickResults.first()).toBeVisible({timeout: 20_000});
    await expect(resultsPanel.locator('.site-search-result-media').first()).toBeVisible();
    await expect(resultsPanel.locator('.site-search-topic-label').first()).toBeVisible();

    await dialog.getByRole('button', {name: 'Close search'}).click();
    await expect(dialog).toBeHidden();
  });
});
