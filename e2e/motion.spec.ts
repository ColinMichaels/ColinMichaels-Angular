import {expect, test} from '@playwright/test';
import {suppressMembershipCampaign} from './support/public-reader-state';

test.describe('site motion', () => {
  test('uses native route transitions and scroll-driven post media reveals', async ({page}) => {
    test.setTimeout(60_000);
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        const text = message.text();
        const sourceUrl = message.location().url;
        const firestoreEmulatorOffline = sourceUrl.startsWith(
          'http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel'
        ) && text.includes('ERR_CONNECTION_REFUSED');

        if (text.includes('Could not reach Cloud Firestore backend') || firestoreEmulatorOffline) {
          return;
        }

        consoleErrors.push(sourceUrl ? `${sourceUrl}: ${text}` : text);
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

    await suppressMembershipCampaign(page);
    await page.goto('/');
    await expect(page.getByRole('heading', {
      level: 1,
      name: 'A Life of Curiosity. A Journey of Growth.',
    })).toBeVisible({timeout: 20_000});
    const viewTransitionsSupported = await page.evaluate(() => (
      typeof document.startViewTransition === 'function'
    ));
    await page.getByRole('link', {name: 'Browse all posts'}).click();

    await expect(page).toHaveURL(/\/blog$/);

    if (viewTransitionsSupported) {
      await expect(page.locator('html')).toHaveAttribute('data-view-transition-count', '1');
    }

    const postImages = page.locator('.blog-image-reveal');

    if (await postImages.count() === 0) {
      // Local/offline Firestore can legitimately return an empty archive. The
      // motion contract is CSS-owned, so add a non-visual probe only when real
      // post media is unavailable instead of coupling the gate to live data.
      await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.className = 'blog-image-reveal';
        probe.dataset['testid'] = 'blog-image-motion-probe';
        probe.hidden = true;
        document.querySelector('.site-theme-scope')?.append(probe);
      });
    }

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
