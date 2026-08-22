import {expect, test} from '@playwright/test';

test.describe('homepage hero viewport fit', () => {
  const homeHeroSelector = '.home-article-hero';

  test('keeps homepage hero content and media within viewport width', async ({page}) => {
    await page.goto('/');

    await expect(page.locator(homeHeroSelector)).toBeVisible({timeout: 20_000});
    const headline = page.getByRole('heading', {
      level: 1,
      name: 'Cool gadgets, useful tech, and internet finds',
    });
    await expect(headline).toBeVisible({timeout: 20_000});
    await expect(page.locator('.home-hero-panel-image')).toBeVisible({timeout: 20_000});

    const metrics = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>('.home-article-hero');
      const panel = document.querySelector<HTMLElement>('.home-hero-panel');
      const storyImage = document.querySelector<HTMLElement>('.home-hero-panel-image');
      const copy = document.querySelector<HTMLElement>('.home-hero-copy');
      const discoveryRail = document.querySelector<HTMLElement>('app-daily-discovery-rail');
      const panelRect = panel?.getBoundingClientRect();
      const imageRect = storyImage?.getBoundingClientRect();
      const imageStyle = storyImage ? getComputedStyle(storyImage) : null;
      const shellRect = hero?.querySelector<HTMLElement>('.home-hero-shell')?.getBoundingClientRect();
      const copyRect = copy?.getBoundingClientRect();
      const discoveryRailRect = discoveryRail?.getBoundingClientRect();

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        overflow: Math.round(document.documentElement.scrollWidth - window.innerWidth),
        shellWidth: Math.round((shellRect?.width ?? 0) * 100) / 100,
        panelLeft: Math.round((panelRect?.left ?? 0) * 100) / 100,
        panelRight: Math.round((panelRect?.right ?? 0) * 100) / 100,
        panelHeight: Math.round((panelRect?.height ?? 0) * 100) / 100,
        imageHeight: Math.round((imageRect?.height ?? 0) * 100) / 100,
        imageObjectFit: imageStyle?.objectFit ?? '',
        copyHeight: Math.round((copyRect?.height ?? 0) * 100) / 100,
        copyBottom: Math.round((copyRect?.bottom ?? 0) * 100) / 100,
        discoveryRailTop: Math.round((discoveryRailRect?.top ?? 0) * 100) / 100,
      };
    });

    expect(metrics.overflow).toBeLessThanOrEqual(0);
    expect(metrics.shellWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.panelLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.panelRight).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.panelHeight).toBeLessThanOrEqual(metrics.viewportHeight * 0.85);
    expect(metrics.imageHeight).toBeLessThanOrEqual(metrics.viewportHeight * 0.85);
    expect(metrics.imageObjectFit).toBe('contain');
    expect(metrics.copyHeight).toBeLessThanOrEqual(metrics.viewportHeight * 0.9);
    expect(metrics.copyBottom).toBeLessThanOrEqual(metrics.discoveryRailTop);
  });
});
