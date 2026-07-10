import {expect, test} from '@playwright/test';

test.describe('blog sticky toolbar', () => {
  test('pins post context and jumps to deferred comments', async ({page}) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('/blog');

    const firstPostLink = page.locator('app-blog-post-card h2 a').first();
    await expect(firstPostLink).toBeVisible();
    const firstPostHref = await firstPostLink.getAttribute('href');

    expect(firstPostHref).toMatch(/^\/blog\/[^/]+$/);
    await page.goto(firstPostHref ?? '/blog');
    await expect(page).toHaveURL(/\/blog\/[^/]+$/);
    await expect(page.getByRole('status', {name: 'Loading latest stories'})).toBeHidden();

    const toolbar = page.locator('app-blog-sticky-post-toolbar');
    const articleTitle = page.locator('article h1').first();

    await expect(toolbar).toBeVisible();
    await expect(toolbar.locator('p')).toHaveText(await articleTitle.innerText());
    await expect(toolbar.locator('img')).toBeVisible();
    const shareTrigger = toolbar.locator('[data-share-trigger]');
    const shareProviders = toolbar.locator('[data-share-provider]');

    await expect(shareTrigger).toBeVisible();
    await expect(shareTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(shareProviders).toHaveCount(5);
    await expect(shareProviders.first()).toBeHidden();

    const supportsHover = await page.evaluate(() => window.matchMedia('(hover: hover)').matches);

    if (supportsHover) {
      await shareTrigger.hover();
      await expect(shareTrigger).toHaveAttribute('aria-expanded', 'true');
      await expect(shareProviders.first()).toBeVisible();
      await page.mouse.move(0, 0);
      await expect(shareTrigger).toHaveAttribute('aria-expanded', 'false');
      await expect(shareProviders.first()).toBeHidden();
    }

    await shareTrigger.click();
    await expect(shareTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(shareProviders.first()).toBeVisible();
    await expect(shareProviders.last()).toBeVisible();

    await shareTrigger.press('Escape');
    await expect(shareTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(shareProviders.first()).toBeHidden();

    await page.locator('app-blog-block-renderer').evaluate(element => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + 320);
    });

    await expect.poll(async () => Math.round((await toolbar.boundingBox())?.y ?? -1)).toBe(72);

    const sectionHeadings = page.locator('[data-sticky-section-heading]');
    const sectionHeadingCount = await sectionHeadings.count();
    const firstSectionHeading = sectionHeadings.nth(0);
    const expectedSectionHeadingTop = (page.viewportSize()?.width ?? 1280) < 640 ? 172 : 140;

    expect(sectionHeadingCount).toBeGreaterThan(1);
    await firstSectionHeading.evaluate(element => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + 220);
    });
    await expect.poll(async () => Math.round((await firstSectionHeading.boundingBox())?.y ?? -1))
      .toBe(expectedSectionHeadingTop);

    const secondSectionHeading = sectionHeadings.nth(1);
    await secondSectionHeading.evaluate(element => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + 220);
    });
    const visibleStickyHeading = await page.evaluate(y => (
      document.elementFromPoint(200, y)?.closest('[data-sticky-section-heading]')?.textContent?.trim()
    ), expectedSectionHeadingTop + 20);

    expect(visibleStickyHeading).toBe((await secondSectionHeading.textContent())?.trim());

    const commentsShortcut = toolbar.getByRole('link', {name: 'Jump to comments'});
    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > window.innerWidth
    ));
    const commentsShortcutIsHitTarget = await commentsShortcut.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const hitTarget = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);

      return hitTarget === element || (hitTarget !== null && element.contains(hitTarget));
    });
    const commentsShortcutBox = await commentsShortcut.boundingBox();

    expect(hasHorizontalOverflow).toBe(false);
    expect(commentsShortcutIsHitTarget).toBe(true);
    expect(commentsShortcutBox).not.toBeNull();

    await page.mouse.click(
      (commentsShortcutBox?.x ?? 0) + (commentsShortcutBox?.width ?? 0) / 2,
      (commentsShortcutBox?.y ?? 0) + (commentsShortcutBox?.height ?? 0) / 2
    );

    const commentsTarget = page.locator('#blog-comments');

    await expect(page).toHaveURL(/#blog-comments$/);
    await expect(commentsTarget).toBeFocused();
    await expect(commentsTarget).toBeInViewport();
    await expect(page.getByRole('heading', {name: 'Comments'})).toBeVisible();

    const scrollTopButton = toolbar.getByRole('button', {name: 'Scroll to top of post'});
    const postTop = page.locator('#blog-post-top');

    await expect(scrollTopButton).toBeVisible();
    await scrollTopButton.click();
    await expect(postTop).toBeFocused();
    await expect.poll(async () => Math.round((await postTop.boundingBox())?.y ?? -1)).toBe(80);

    const unexpectedConsoleErrors = consoleErrors.filter(message => (
      !message.includes('server responded with a status of 401')
    ));

    expect(unexpectedConsoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
