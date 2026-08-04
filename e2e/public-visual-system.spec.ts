import {expect, test} from '@playwright/test';

test.describe('public visual system', () => {
  test('keeps shared rhythm, surfaces, and archive widths responsive', async ({page}) => {
    test.setTimeout(60_000);
    await page.goto('/');

    await expect(page.getByRole('heading', {
      level: 1,
      name: 'A Life of Curiosity. A Journey of Growth.',
    })).toBeVisible({timeout: 20_000});

    const headerSearch = page.getByRole('searchbox', {name: 'Search posts'});
    const menuButton = page.getByRole('button', {name: 'Open site menu'});
    await expect(headerSearch).toHaveClass(/site-header-search-input/);
    await expect(menuButton).toHaveClass(/site-icon-control/);

    await menuButton.click();
    const utilityMenu = page.getByRole('navigation', {name: 'Account and site menu'});
    await expect(utilityMenu).toBeVisible();
    await expect(utilityMenu.getByRole('link', {name: 'All Posts'})).toHaveClass(/site-menu-link/);
    await expect(utilityMenu.getByRole('link', {name: 'Open OS'})).toHaveClass(/site-menu-link-success/);

    const menuControlMetrics = await utilityMenu.locator('.site-menu-link').evaluateAll(controls => (
      controls.map(control => ({
        height: control.getBoundingClientRect().height,
        radius: Number.parseFloat(getComputedStyle(control).borderRadius),
      }))
    ));
    expect(menuControlMetrics.length).toBeGreaterThanOrEqual(4);
    expect(menuControlMetrics.every(control => control.height >= 44)).toBe(true);
    expect(menuControlMetrics.every(control => control.radius === 8)).toBe(true);

    await page.getByRole('button', {name: 'Close site menu'}).click();
    await expect(utilityMenu).toBeHidden();

    const homepageMetrics = await page.evaluate(() => {
      const tokenHost = document.querySelector<HTMLElement>('.site-theme-scope');
      const section = document.querySelector<HTMLElement>('.site-section');
      const surface = document.querySelector<HTMLElement>('.site-resource-link');
      const sectionStyle = section ? getComputedStyle(section) : null;
      const surfaceStyle = surface ? getComputedStyle(surface) : null;
      const tokenStyle = tokenHost ? getComputedStyle(tokenHost) : null;

      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        gutterToken: tokenStyle?.getPropertyValue('--site-gutter').trim() ?? '',
        headerSearchHeight: document.querySelector<HTMLElement>('.site-header-search-input')?.getBoundingClientRect().height ?? 0,
        headerMenuHeight: document.querySelector<HTMLElement>('.site-icon-control')?.getBoundingClientRect().height ?? 0,
        sectionPaddingInline: sectionStyle ? Number.parseFloat(sectionStyle.paddingInline) : 0,
        surfaceRadius: surfaceStyle ? Number.parseFloat(surfaceStyle.borderRadius) : 0,
        surfaceShadow: surfaceStyle?.boxShadow ?? 'none',
      };
    });

    expect(homepageMetrics.overflow).toBeLessThanOrEqual(0);
    expect(homepageMetrics.gutterToken).toContain('clamp');
    expect(homepageMetrics.headerSearchHeight).toBe(44);
    expect(homepageMetrics.headerMenuHeight).toBe(44);
    expect(homepageMetrics.sectionPaddingInline).toBeGreaterThanOrEqual(16);
    expect(homepageMetrics.sectionPaddingInline).toBeLessThanOrEqual(32);
    expect(homepageMetrics.surfaceRadius).toBe(12);
    expect(homepageMetrics.surfaceShadow).not.toBe('none');

    await page.goto('/blog');
    await expect(page.getByRole('heading', {level: 1, name: 'Blog'})).toBeVisible({timeout: 20_000});

    const archiveMetrics = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>('.site-layout-reading');
      const action = document.querySelector<HTMLElement>('.blog-action-icon');

      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        shellWidth: shell?.getBoundingClientRect().width ?? 0,
        actionWidth: action?.getBoundingClientRect().width ?? 0,
        actionHeight: action?.getBoundingClientRect().height ?? 0,
      };
    });

    expect(archiveMetrics.overflow).toBeLessThanOrEqual(0);
    expect(archiveMetrics.shellWidth).toBeGreaterThan(0);
    expect(archiveMetrics.shellWidth).toBeLessThanOrEqual(1024);
    expect(archiveMetrics.actionWidth).toBeGreaterThanOrEqual(44);
    expect(archiveMetrics.actionHeight).toBeGreaterThanOrEqual(44);
  });
});
