import {expect, Page, test} from '@playwright/test';

async function openSearchDrawer(page: Page): Promise<void> {
  const desktopSearch = page
    .getByRole('navigation', {name: 'Primary navigation'})
    .getByRole('button', {name: 'Search'});

  if (await desktopSearch.isVisible()) {
    await desktopSearch.click();
    return;
  }

  await page.getByRole('button', {name: 'Toggle navigation menu'}).click();
  await page
    .locator('#site-mobile-menu')
    .getByRole('button', {name: 'Search'})
    .click();
}

test.describe('site search drawer', () => {
  test('opens above page content and renders visual quick results', async ({page}) => {
    await page.goto('/');

    await openSearchDrawer(page);

    const dialog = page.getByRole('dialog', {name: 'Find posts and pages'});
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('aside')).toHaveCSS('position', 'absolute');

    await dialog.getByRole('searchbox', {name: 'Search query'}).fill('architecture');

    const quickResults = dialog.locator('a.site-search-quick-result');
    await expect(quickResults.first()).toBeVisible();
    await expect(dialog.locator('.site-search-result-media').first()).toBeVisible();
    await expect(dialog.locator('.site-search-topic-label').first()).toBeVisible();

    await dialog.locator('aside').getByRole('button', {name: 'Close search'}).click();
    await expect(dialog).toBeHidden();
  });
});
