import {expect, Page, test} from '@playwright/test';

async function openSearchDrawer(page: Page): Promise<void> {
  // The compact header uses one always-visible search trigger at every width.
  // Focusing it opens the same drawer without coupling the test to menu layout.
  await page.getByRole('searchbox', {name: 'Search posts'}).focus();
}

test.describe('site search drawer', () => {
  test('opens above page content and renders visual quick results', async ({page}) => {
    await page.goto('/');

    await openSearchDrawer(page);

    const dialog = page.getByRole('dialog', {name: 'Find posts and pages'});
    await expect(dialog).toBeVisible();
    const expectedPosition = (page.viewportSize()?.width ?? 0) >= 640 ? 'absolute' : 'fixed';
    await expect(dialog).toHaveCSS('position', expectedPosition);

    await page.getByRole('searchbox', {name: 'Search posts'}).fill('architecture');

    const quickResults = dialog.locator('a.site-search-quick-result');
    await expect(quickResults.first()).toBeVisible();
    await expect(dialog.locator('.site-search-result-media').first()).toBeVisible();
    await expect(dialog.locator('.site-search-topic-label').first()).toBeVisible();

    await dialog.getByRole('button', {name: 'Close search'}).click();
    await expect(dialog).toBeHidden();
  });
});
