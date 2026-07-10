import {expect, test} from '@playwright/test';

test.describe('site motion', () => {
  test('uses native route transitions and scroll-driven post media reveals', async ({page}) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.addInitScript(() => {
      if (typeof document.startViewTransition !== 'function') {
        return;
      }

      const startViewTransition = document.startViewTransition.bind(document);

      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: (callbackOptions?: ViewTransitionUpdateCallback | StartViewTransitionOptions) => {
          const transitionCount = Number(document.documentElement.dataset['viewTransitionCount'] ?? '0');
          document.documentElement.dataset['viewTransitionCount'] = String(transitionCount + 1);

          return startViewTransition(callbackOptions);
        },
      });
    });

    await page.goto('/');
    await page.getByRole('link', {name: 'Browse all posts'}).click();

    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.locator('html')).toHaveAttribute('data-view-transition-count', '1');

    const firstPostImage = page.locator('.blog-image-reveal').first();

    await expect(firstPostImage).toBeAttached();
    await expect(firstPostImage).toHaveCSS('animation-name', 'blog-image-scroll-reveal');
    await expect(firstPostImage).toHaveCSS('animation-timing-function', 'ease-in-out');

    const animationTimeline = await firstPostImage.evaluate(element => (
      getComputedStyle(element).animationTimeline
    ));

    expect(animationTimeline).toContain('view');

    await page.emulateMedia({reducedMotion: 'reduce'});
    await expect(firstPostImage).toHaveCSS('animation-name', 'none');
    await expect(firstPostImage).toHaveCSS('opacity', '1');
    await expect(firstPostImage).toHaveCSS('transform', 'none');
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
