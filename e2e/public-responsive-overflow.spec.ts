import {expect, type Page, test} from '@playwright/test';

const PUBLIC_ROUTES = [
  {path: '/', readySelector: 'app-main'},
  {path: '/blog', readySelector: 'app-blog-index .blog-index-content'},
  {path: '/authors/colin-michaels', readySelector: 'app-author-page'},
  {path: '/topics/gadgets-toys', readySelector: 'app-topic-hub'},
] as const;

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${
            [...element.classList].map(className => `.${className}`).join('')
          }`,
          left: Math.round(rect.left * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
        };
      })
      .filter(rect => rect.left < -0.5 || rect.right > window.innerWidth + 0.5)
      .slice(0, 8);

    return {offenders, overflow};
  });

  expect(result.overflow, JSON.stringify(result.offenders, null, 2)).toBeLessThanOrEqual(0);
}

for (const viewport of [
  {name: 'mobile', width: 390, height: 844},
  {name: 'desktop', width: 1280, height: 900},
]) {
  test.describe(`public pages at ${viewport.name} width`, () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route.path} has no horizontal page overflow`, async ({page}) => {
        await page.setViewportSize({width: viewport.width, height: viewport.height});
        await page.goto(route.path);

        await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 5_000});
        await expect(page.locator(route.readySelector)).toBeVisible({timeout: 20_000});

        await expectNoHorizontalOverflow(page);
      });
    }

    test('the first published article has no horizontal page overflow', async ({page}) => {
      await page.setViewportSize({width: viewport.width, height: viewport.height});
      await page.goto('/blog');

      const firstPostLink = page
        .getByRole('region', {name: 'Published blog posts'})
        .locator('h2 a')
        .first();
      await expect(firstPostLink).toBeVisible({timeout: 20_000});
      const firstPostHref = await firstPostLink.getAttribute('href');

      expect(firstPostHref).toMatch(/^\/blog\/[^/]+$/);
      await page.goto(firstPostHref ?? '/blog');
      await expect(page.locator('app-blog-detail [data-reading-content]')).toBeVisible({timeout: 20_000});

      await expectNoHorizontalOverflow(page);
    });
  });
}
