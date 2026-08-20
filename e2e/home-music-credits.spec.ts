import {expect, test} from '@playwright/test';

for (const viewport of [
  {name: 'desktop', width: 1280, height: 900},
  {name: 'mobile', width: 390, height: 844},
]) {
  test.describe(`home music credits at ${viewport.name} width`, () => {
    test('keeps the award and credit list readable, responsive, and interactive', async ({page}) => {
      await page.setViewportSize({width: viewport.width, height: viewport.height});
      await page.goto('/');

      await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 5_000});
      // The profile section is intentionally deferred until it enters the
      // viewport, so bring its stable placeholder into view before querying
      // the award and credits rendered inside it.
      await page.locator('#about').scrollIntoViewIfNeeded();
      const recognition = page.getByRole('heading', {name: '2006 Latin GRAMMY® Award — Best Urban Music Album'});
      await expect(recognition).toBeVisible({timeout: 20_000});

      const credits = page.locator('app-music-credits');
      await credits.scrollIntoViewIfNeeded();
      await expect(credits.getByText('Showing 6 of 33 credits')).toBeVisible();
      await credits.getByRole('button', {name: 'Show all 33 credits'}).click();
      await expect(credits.getByText('Showing 33 of 33 credits')).toBeVisible();

      const search = credits.getByPlaceholder('Search credits');
      await search.fill('Calle 13');
      await expect(credits.getByText('Showing 1 of 1 credits')).toBeVisible();
      await expect(credits.getByRole('heading', {name: 'Calle 13'})).toBeVisible();

      const metrics = await page.evaluate(() => {
        const awardImage = document.querySelector<HTMLImageElement>(
          'img[alt*="Latin GRAMMY plaque"]',
        );
        const credits = document.querySelector<HTMLElement>('app-music-credits');
        const creditsRect = credits?.getBoundingClientRect();

        return {
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
          awardImageWidth: awardImage?.getBoundingClientRect().width ?? 0,
          awardImageNaturalWidth: awardImage?.naturalWidth ?? 0,
          creditOverflow: Math.max(0, (creditsRect?.right ?? 0) - window.innerWidth),
        };
      });

      expect(metrics.pageOverflow).toBeLessThanOrEqual(0);
      expect(metrics.creditOverflow).toBeLessThanOrEqual(0);
      expect(metrics.awardImageWidth).toBeGreaterThan(0);
      expect(metrics.awardImageNaturalWidth).toBeGreaterThan(0);
    });
  });
}
