import {expect, test} from '@playwright/test';

test.describe('blog archive layout', () => {
  test('keeps the reading list primary while preserving a readable desktop rail', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/blog');

    await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 5_000});
    await expect(page.locator('app-blog-index .blog-index-content')).toBeVisible({timeout: 20_000});

    const metrics = await page.evaluate(() => {
      const content = document.querySelector<HTMLElement>('.blog-index-content');
      const main = document.querySelector<HTMLElement>('.blog-index-main-column');
      const sidebar = document.querySelector<HTMLElement>('.blog-index-sidebar');
      const contentRect = content?.getBoundingClientRect();

      return {
        archiveOverflow: Math.max(0, (contentRect?.right ?? 0) - window.innerWidth),
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        mainWidth: main?.getBoundingClientRect().width ?? 0,
        sidebarWidth: sidebar?.getBoundingClientRect().width ?? 0,
        template: content ? getComputedStyle(content).gridTemplateColumns : '',
      };
    });

    expect(metrics.archiveOverflow).toBeLessThanOrEqual(0);
    expect(metrics.pageOverflow).toBeLessThanOrEqual(0);
    expect(metrics.template).toContain('px');
    expect(metrics.mainWidth).toBeGreaterThan(640);
    expect(metrics.sidebarWidth).toBeGreaterThanOrEqual(304);
    expect(metrics.sidebarWidth).toBeLessThanOrEqual(352.5);
    expect(metrics.mainWidth).toBeGreaterThan(metrics.sidebarWidth * 1.8);
  });

  test('stacks the rail below the archive before desktop spacing becomes cramped', async ({page}) => {
    await page.setViewportSize({width: 768, height: 900});
    await page.goto('/blog');

    await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 5_000});
    await expect(page.locator('app-blog-index .blog-index-content')).toBeVisible({timeout: 20_000});

    const metrics = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>('.blog-index-main-column');
      const sidebar = document.querySelector<HTMLElement>('.blog-index-sidebar');
      const content = document.querySelector<HTMLElement>('.blog-index-content');
      const mainRect = main?.getBoundingClientRect();
      const sidebarRect = sidebar?.getBoundingClientRect();
      const contentRect = content?.getBoundingClientRect();

      return {
        archiveOverflow: Math.max(0, (contentRect?.right ?? 0) - window.innerWidth),
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        mainBottom: mainRect?.bottom ?? 0,
        sidebarTop: sidebarRect?.top ?? 0,
      };
    });

    expect(metrics.archiveOverflow).toBeLessThanOrEqual(0);
    expect(metrics.pageOverflow).toBeLessThanOrEqual(0);
    expect(metrics.sidebarTop).toBeGreaterThanOrEqual(metrics.mainBottom);
  });
});
