import {expect, test} from '@playwright/test';

const PUBLIC_ROUTES = [
  {path: '/', readySelector: 'app-main'},
  {path: '/blog', readySelector: 'app-blog-index .blog-index-content'},
  {
    path: '/blog/when-did-healthcare-become-pay-to-play',
    readySelector: 'app-blog-detail [data-reading-content]',
  },
  {path: '/authors/colin-michaels', readySelector: 'app-author-page'},
  {path: '/topics/gadgets-toys', readySelector: 'app-topic-hub'},
] as const;

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

        const overflow = await page.evaluate(() => (
          document.documentElement.scrollWidth - window.innerWidth
        ));

        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });
}
