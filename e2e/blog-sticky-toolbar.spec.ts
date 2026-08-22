import {expect, test} from '@playwright/test';
import {suppressMembershipCampaign} from './support/public-reader-state';

test.describe('blog sticky toolbar', () => {
  test('pins post context and jumps to deferred comments', async ({page}) => {
    test.setTimeout(60_000);
    const consoleErrors: Array<{ sourceUrl: string; text: string }> = [];
    const pageErrors: string[] = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push({
          sourceUrl: message.location().url,
          text: message.text(),
        });
      }
    });
    page.on('pageerror', error => pageErrors.push(error.message));

    await suppressMembershipCampaign(page);
    // This committed production-baseline article has multiple real Heading
    // blocks, a generated contents list, and article media. A fixed contract
    // route prevents missing headings in another post from bypassing the test.
    await page.goto('/blog/they-bought-a-full-size-temu-mega-drone');
    await expect(page).toHaveURL(/\/blog\/they-bought-a-full-size-temu-mega-drone$/);
    await expect(page.getByRole('status', {name: 'Loading latest stories'})).toBeHidden();

    const toolbar = page.locator('app-blog-sticky-post-toolbar');
    const siteHeader = page.locator('app-site-header > header');
    const articleTitle = page.locator('article h1').first();
    const readingProgress = toolbar.getByRole('progressbar', {name: 'Article reading progress'});
    const readingContent = page.locator('[data-reading-content]');

    await expect(toolbar).toBeVisible();
    await expect(toolbar.locator('p')).toHaveText(await articleTitle.innerText());
    await expect(toolbar.locator('img')).toBeVisible();
    await expect(readingContent).toBeVisible();
    await expect(readingProgress).toHaveAttribute('aria-valuenow', '0');
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

    await readingContent.locator('app-blog-block-renderer').evaluate(element => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + 320);
    });

    await expect.poll(async () => {
      const siteHeaderBox = await siteHeader.boundingBox();
      const toolbarBox = await toolbar.boundingBox();

      return Math.abs(Math.round(
        (toolbarBox?.y ?? -1) - ((siteHeaderBox?.y ?? 0) + (siteHeaderBox?.height ?? 0))
      ));
    }).toBeLessThanOrEqual(1);
    await expect.poll(async () => Number(await readingProgress.getAttribute('aria-valuenow')))
      .toBeGreaterThan(0);

    const sectionHeadings = page.locator('[data-sticky-section-heading]');
    const sectionHeadingCount = await sectionHeadings.count();
    const firstSectionHeading = sectionHeadings.nth(0);
    const expectedSectionHeadingTop = (page.viewportSize()?.width ?? 1280) < 640 ? 108 : 124;

    expect(sectionHeadingCount).toBeGreaterThan(1);
    await firstSectionHeading.evaluate((element, stickyTop) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - stickyTop + 1);
    }, expectedSectionHeadingTop);
    await expect(firstSectionHeading).toHaveAttribute('data-sticky-active', '');
    await expect.poll(async () => Math.round((await firstSectionHeading.boundingBox())?.y ?? -1))
      .toBe(expectedSectionHeadingTop);
    await expect.poll(async () => {
      const toolbarBox = await toolbar.boundingBox();
      const sectionHeadingBox = await firstSectionHeading.boundingBox();

      return Math.round((sectionHeadingBox?.y ?? -1) - ((toolbarBox?.y ?? 0) + (toolbarBox?.height ?? 0)));
    }).toBe(0);

    const secondSectionHeading = sectionHeadings.nth(1);
    const secondHeadingId = (await secondSectionHeading.getAttribute('id')) ?? '';
    await secondSectionHeading.evaluate((element, stickyTop) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - stickyTop + 1);
    }, expectedSectionHeadingTop);
    await expect(secondSectionHeading).toHaveAttribute('data-sticky-active', '');
    await expect(page.locator('[data-sticky-active]')).toHaveCount(1);
    const secondHeadingBox = await secondSectionHeading.boundingBox();
    const visibleStickyHeading = await page.evaluate(({x, y}) => (
      document.elementFromPoint(x, y)?.closest('[data-sticky-section-heading]')?.textContent?.trim()
    ), {
      x: (secondHeadingBox?.x ?? 0) + Math.min(24, Math.max(1, (secondHeadingBox?.width ?? 2) / 2)),
      y: expectedSectionHeadingTop + 20,
    });

    expect(visibleStickyHeading).toBe((await secondSectionHeading.textContent())?.trim());

    const tableOfContents = page.locator('app-blog-table-of-contents');
    const activeContentsLink = tableOfContents.locator('[aria-current="location"]');

    await expect(activeContentsLink).toHaveAttribute('href', new RegExp(`#${secondHeadingId}$`));

    if ((page.viewportSize()?.width ?? 0) >= 1280) {
      const siteHeaderBox = await siteHeader.boundingBox();
      const tableOfContentsBox = await tableOfContents.boundingBox();
      const activeContentsLinkBox = await activeContentsLink.boundingBox();

      expect(tableOfContentsBox).not.toBeNull();
      expect(activeContentsLinkBox).not.toBeNull();
      expect((tableOfContentsBox?.y ?? 0)).toBeGreaterThan(siteHeaderBox?.height ?? 0);
      expect((activeContentsLinkBox?.y ?? 0)).toBeGreaterThanOrEqual(tableOfContentsBox?.y ?? 0);
      expect((activeContentsLinkBox?.y ?? 0) + (activeContentsLinkBox?.height ?? 0))
        .toBeLessThanOrEqual((tableOfContentsBox?.y ?? 0) + (tableOfContentsBox?.height ?? 0));
    }

    const firstHeadingId = (await firstSectionHeading.getAttribute('id')) ?? '';
    const firstContentsLink = tableOfContents.locator(`[href$="#${firstHeadingId}"]`);
    const scrollTopBeforeBackwardJump = await page.evaluate(() => window.scrollY);

    expect(firstHeadingId).toBeTruthy();
    if ((page.viewportSize()?.width ?? 0) < 1280) {
      await tableOfContents.getByRole('button', {name: /Contents/}).click();
      await expect(firstContentsLink).toBeVisible();
    }
    await firstContentsLink.click();
    await expect(page).toHaveURL(new RegExp(`#${firstHeadingId}$`));
    await expect.poll(async () => page.evaluate(() => window.scrollY))
      .toBeLessThan(scrollTopBeforeBackwardJump);
    await expect.poll(async () => Math.round((await firstSectionHeading.boundingBox())?.y ?? -1))
      .toBe(expectedSectionHeadingTop);
    await expect(tableOfContents.locator(`[href$="#${firstHeadingId}"]`))
      .toHaveAttribute('aria-current', 'location');

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

    // Use the supported reduced-motion path so a long, media-rich article
    // cannot leave this interaction waiting on a browser smooth-scroll
    // animation while images continue to settle on a mobile viewport.
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.mouse.click(
      (commentsShortcutBox?.x ?? 0) + (commentsShortcutBox?.width ?? 0) / 2,
      (commentsShortcutBox?.y ?? 0) + (commentsShortcutBox?.height ?? 0) / 2
    );

    const commentsTarget = page.locator('#blog-comments');

    await expect(page).toHaveURL(/#blog-comments$/);
    await expect(commentsTarget).toBeFocused();
    await expect(commentsTarget).toBeInViewport({timeout: 10_000});
    await expect(page.getByRole('heading', {name: 'Comments'})).toBeVisible();
    await expect(readingProgress).toHaveAttribute('aria-valuenow', '100');

    const scrollTopButton = toolbar.getByRole('button', {name: 'Scroll to top of post'});
    const postTop = page.locator('#blog-post-top');

    await expect(scrollTopButton).toBeVisible();
    await scrollTopButton.click();
    await expect(postTop).toBeFocused();
    await expect.poll(async () => Math.round((await postTop.boundingBox())?.y ?? -1)).toBe(80);

    const unexpectedConsoleErrors = consoleErrors
      .filter(({sourceUrl, text}) => {
        const knownLocalEmulatorOrigin = sourceUrl.startsWith('http://127.0.0.1:5001/')
          || sourceUrl.startsWith('http://127.0.0.1:8080/');

        return !text.includes('server responded with a status of 401')
          && !(knownLocalEmulatorOrigin && text.includes('ERR_CONNECTION_REFUSED'));
      })
      .map(({sourceUrl, text}) => sourceUrl ? `${sourceUrl}: ${text}` : text);

    expect(unexpectedConsoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
