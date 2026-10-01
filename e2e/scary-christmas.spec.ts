import {expect, Locator, Page, test} from '@playwright/test';

import {
  SCARY_CHRISTMAS_CANDIES,
  SCARY_CHRISTMAS_CONFIG,
  SCARY_CHRISTMAS_STORAGE_KEY,
} from '../src/app/features/scary-christmas/scary-christmas.config';
import {chooseEdition, SEASONAL_PREFERENCE_STORAGE_KEY} from '../src/app/features/seasonal/seasonal.config';
import {suppressMembershipCampaign} from './support/public-reader-state';

function lanternLauncher(page: Page, count: number): Locator {
  return page.getByRole('button', {name: `Open your lantern: ${count} of 8 candies`, exact: true});
}

async function visitPublicRoute(page: Page, route: string): Promise<void> {
  await page.goto(route, {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 15_000});
  await expect(page.locator('app-root')).toHaveClass(/seasonal-theme/);
}

async function openLantern(page: Page, count: number): Promise<Locator> {
  await lanternLauncher(page, count).click();
  const dialog = page.getByRole('dialog', {name: 'Your lantern', exact: true});
  await expect(dialog).toBeVisible();
  return dialog;
}

async function collectedIds(page: Page): Promise<string[]> {
  return page.evaluate(key => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).collectedIds : [];
  }, SCARY_CHRISTMAS_STORAGE_KEY);
}

test.describe('Scary Christmas date-activated main-site hunt', () => {
  test.beforeEach(async ({page}, testInfo) => {
    await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
    const excludedSurface = testInfo.title === 'keeps the privacy page outside the seasonal experience'
      || testInfo.title === 'excludes preview, administrative, authentication, profile, and Core OS surfaces';
    test.skip(!excludedSurface && chooseEdition('/', new Date('2026-10-15T12:00:00Z'))?.id !== 'scary-christmas-2026',
      'Main-site Halloween regressions require a calendar-approved or owner-activated Halloween edition. Archive and excluded-route regressions remain active.');
    await suppressMembershipCampaign(page);
  });

  test('collects at public hiding places and keeps each candy counted once across refreshes', async ({page}) => {
    await visitPublicRoute(page, '/');
    await expect(lanternLauncher(page, 0)).toBeVisible();
    await page.getByTestId('collectible-ember-toffee').click();
    await expect(lanternLauncher(page, 1)).toBeVisible();
    await expect(page.getByTestId('collectible-ember-toffee')).toHaveCount(0);

    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(lanternLauncher(page, 1)).toBeVisible();
    await expect(page.getByTestId('collectible-ember-toffee')).toHaveCount(0);
    await page.getByTestId('collectible-moonlit-mint').click();
    await expect(lanternLauncher(page, 2)).toBeVisible();

    await visitPublicRoute(page, '/blog');
    await expect(lanternLauncher(page, 2)).toBeVisible();
    await page.getByTestId('collectible-midnight-caramel').click();
    await expect(lanternLauncher(page, 3)).toBeVisible();
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(page.getByTestId('collectible-midnight-caramel')).toHaveCount(0);
    await expect(lanternLauncher(page, 3)).toBeVisible();
    expect(await collectedIds(page)).toEqual(['ember-toffee', 'moonlit-mint', 'midnight-caramel']);
  });

  test('uses optional clue links to explore and complete the eight-candy lantern', async ({page}) => {
    test.setTimeout(90_000);
    await visitPublicRoute(page, '/');
    await lanternLauncher(page, 0).click();
    const dialog = page.getByRole('dialog', {name: 'Your lantern', exact: true});
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('a[href="/topics/gadgets-toys"]')).toHaveCount(0);
    await dialog.getByRole('button', {name: 'Show clues', exact: true}).click();
    await expect(dialog.getByRole('button', {name: 'Hide clues', exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: 'Hide clues', exact: true}).click();
    await expect(dialog.locator('a[href="/topics/gadgets-toys"]')).toHaveCount(0);
    await dialog.getByRole('button', {name: 'Show clues', exact: true}).click();
    await dialog.locator('a[href="/topics/gadgets-toys"]').click();
    await expect(page).toHaveURL(/\/topics\/gadgets-toys$/);
    await expect(dialog).toBeHidden();
    await page.getByTestId('collectible-witchy-wonder').click();
    let count = 1;
    await expect(lanternLauncher(page, count)).toBeVisible();

    let currentRoute = '/topics/gadgets-toys';
    for (const candy of SCARY_CHRISTMAS_CANDIES.filter(item => item.id !== 'witchy-wonder')) {
      if (candy.route !== currentRoute) {
        await visitPublicRoute(page, candy.route);
        currentRoute = candy.route;
      }
      await page.getByTestId(`collectible-${candy.id}`).click();
      count += 1;
      await expect(lanternLauncher(page, count)).toBeVisible();
    }

    expect(await collectedIds(page)).toHaveLength(8);
    expect(new Set(await collectedIds(page)).size).toBe(8);
    expect(new Set(await collectedIds(page))).toEqual(new Set(SCARY_CHRISTMAS_CANDIES.map(candy => candy.id)));
    const completedLantern = await openLantern(page, 8);
    await expect(completedLantern.getByRole('heading', {name: 'A lantern full of little wonders.', exact: true}))
      .toBeVisible();
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(lanternLauncher(page, 8)).toBeVisible();
  });

  test('keeps anonymous visitors on the owner design despite stored account bypass while retaining progress', async ({page}) => {
    await page.addInitScript(({preferenceKey, progressKey}) => {
      if (!localStorage.getItem(preferenceKey)) {
        localStorage.setItem(preferenceKey, JSON.stringify({version: 1, editionId: null, disabled: true}));
        localStorage.setItem(progressKey, JSON.stringify({version: 1, enabled: false, collectedIds: ['ember-toffee']}));
      }
    }, {preferenceKey: SEASONAL_PREFERENCE_STORAGE_KEY, progressKey: SCARY_CHRISTMAS_STORAGE_KEY});
    await visitPublicRoute(page, '/');
    await expect(lanternLauncher(page, 1)).toBeVisible();
    await expect(page.getByRole('button', {name: /Holiday options|Bring back /})).toHaveCount(0);
    await page.getByTestId('collectible-moonlit-mint').click();
    const dialog = await openLantern(page, 2);
    await expect(dialog.locator('.seasonal-theme-settings')).toHaveCount(0);
    await dialog.getByRole('button', {name: 'Keep exploring', exact: true}).click();
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(page.locator('app-root')).toHaveClass(/seasonal-theme/);
    await expect(lanternLauncher(page, 2)).toBeVisible();
    await expect(page.getByTestId('collectible-ember-toffee')).toHaveCount(0);
    expect(await collectedIds(page)).toEqual(['ember-toffee', 'moonlit-mint']);
  });

  test('requires reset confirmation and preserves progress when reset is cancelled', async ({page}) => {
    await visitPublicRoute(page, '/');
    await page.getByTestId('collectible-ember-toffee').click();
    const dialog = await openLantern(page, 1);
    await dialog.getByRole('button', {name: 'Reset hunt', exact: true}).click();
    await expect(dialog.getByRole('button', {name: 'Start over', exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: 'Keep my collection', exact: true}).click();
    expect(await collectedIds(page)).toEqual(['ember-toffee']);
    await expect(dialog.getByRole('button', {name: 'Start over', exact: true})).toHaveCount(0);

    await dialog.getByRole('button', {name: 'Reset hunt', exact: true}).click();
    await dialog.getByRole('button', {name: 'Start over', exact: true}).click();
    expect(await collectedIds(page)).toEqual([]);
    await expect(dialog.getByRole('button', {name: 'Keep exploring', exact: true})).toBeFocused();
    await dialog.getByRole('button', {name: 'Keep exploring', exact: true}).click();
    await expect(lanternLauncher(page, 0)).toBeVisible();
    await expect(page.getByTestId('collectible-ember-toffee')).toBeVisible();
  });

  test('closes the lantern with Escape and returns keyboard focus to its launcher', async ({page}) => {
    await visitPublicRoute(page, '/');
    const launcher = lanternLauncher(page, 0);
    await launcher.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', {name: 'Your lantern', exact: true});
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(launcher).toBeFocused();
  });

  test('keeps the homepage CTA first and links to Dreadnauts without loading seasonal audio', async ({page}) => {
    const soundtrackRequests: string[] = [];
    page.on('request', request => {
      if (SCARY_CHRISTMAS_CONFIG.musicSrc && request.url().includes(SCARY_CHRISTMAS_CONFIG.musicSrc)) {
        soundtrackRequests.push(request.url());
      }
    });
    await visitPublicRoute(page, '/');
    await expect(page.locator('app-seasonal-banner')).toHaveCount(0);
    await expect(page.locator('.seasonal-garland')).toBeVisible();
    const hero = page.locator('#home-article-hero');
    await expect(hero.getByRole('heading', {level: 1})).toBeVisible();
    await expect(hero.getByRole('link', {name: 'Gadgets & finds', exact: true})).toBeInViewport();
    const headerBox = await page.locator('app-site-header').boundingBox();
    const heroBox = await hero.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(heroBox).not.toBeNull();
    expect(heroBox!.y - (headerBox!.y + headerBox!.height)).toBeLessThanOrEqual(2);
    const candyBox = await page.getByTestId('collectible-ember-toffee').boundingBox();
    expect(candyBox!.y).toBeGreaterThanOrEqual(heroBox!.y + heroBox!.height);
    const dialog = await openLantern(page, 0);
    const link = dialog.getByRole('link', {name: 'Listen to the Dreadnauts ↗', exact: true});
    await expect(link).toHaveAttribute('href', SCARY_CHRISTMAS_CONFIG.musicHref);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.locator('audio')).toHaveCount(0);
    await expect(dialog.getByRole('button', {name: 'Play Spooky', exact: true})).toHaveCount(0);
    expect(soundtrackRequests).toEqual([]);
  });

  test('fits 390- and 320-pixel screens with 44-pixel targets and no dialog overflow', async ({page}) => {
    for (const viewport of [{width: 390, height: 844}, {width: 320, height: 740}]) {
      await page.setViewportSize(viewport);
      await visitPublicRoute(page, '/');
      const candy = page.getByTestId('collectible-ember-toffee');
      const launcher = lanternLauncher(page, 0);
      await expect(candy).toBeVisible();
      await expect(launcher).toBeVisible();
      for (const target of [candy, launcher]) {
        const box = await target.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
        .toBeLessThanOrEqual(1);

      const dialog = await openLantern(page, 0);
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      const innerWidth = await dialog.evaluate(element => ({
        scroll: element.scrollWidth, client: element.clientWidth,
      }));
      expect(innerWidth.scroll).toBeLessThanOrEqual(innerWidth.client);
      const close = dialog.getByRole('button', {name: 'Close your lantern', exact: true});
      const closeBox = await close.boundingBox();
      expect(closeBox).not.toBeNull();
      expect(closeBox!.x).toBeGreaterThanOrEqual(box!.x);
      expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(box!.x + box!.width);
      expect(closeBox!.y).toBeGreaterThanOrEqual(box!.y);
      expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(viewport.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
        .toBeLessThanOrEqual(1);
      await close.click();
    }
  });

  test('keeps the privacy page outside the seasonal experience', async ({page}) => {
    await page.goto('/privacy', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 15_000});
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    await expect(page.getByRole('button', {name: /Open your lantern:/})).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Bring back Scary Christmas', exact: true})).toHaveCount(0);
    await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(0);
    await expect(page.getByRole('dialog', {name: 'Your lantern', exact: true})).toHaveCount(0);
    await expect(page.getByTestId('seasonal-soundtrack')).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
  });

  for (const mode of ['light', 'dark'] as const) {
    test(`respects the saved ${mode} theme in the anonymous owner-selected experience`, async ({page}) => {
      await page.addInitScript(savedMode => {
        localStorage.setItem('colinmichaels-site-theme', savedMode);
      }, mode);
      await visitPublicRoute(page, '/');
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${mode}\\b`));
      await expect(lanternLauncher(page, 0)).toBeVisible();
      await expect(page.getByTestId('collectible-ember-toffee')).toBeVisible();
      const background = await page.locator('.app-route-frame').evaluate(element => {
        const color = getComputedStyle(element).backgroundColor;
        return color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
      });
      expect(background).toHaveLength(3);
      expect(background.every(channel => mode === 'light' ? channel > 180 : channel < 60)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
        .toBeLessThanOrEqual(1);

      const dialog = await openLantern(page, 0);
      await expect(dialog.locator('.seasonal-theme-settings')).toHaveCount(0);
      await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${mode}\\b`));
      expect(await page.evaluate(() => localStorage.getItem('colinmichaels-site-theme'))).toBe(mode);
      await dialog.getByRole('button', {name: 'Keep exploring', exact: true}).click();
      await expect(page.locator('app-root')).toHaveClass(/seasonal-theme/);
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${mode}\\b`));
      expect(await page.evaluate(() => localStorage.getItem('colinmichaels-site-theme'))).toBe(mode);
    });
  }

  for (const source of ['system', 'reader'] as const) {
    test(`honors the ${source} reduced-motion preference while keeping candies usable`, async ({page}) => {
      await page.emulateMedia({reducedMotion: source === 'system' ? 'reduce' : 'no-preference'});
      if (source === 'reader') {
        await page.addInitScript(() => {
          localStorage.setItem('colinmichaels-reader-preferences-v1', JSON.stringify({
            fontScale: 100, spacing: 'normal', highContrast: false, reduceMotion: true,
          }));
        });
      }
      await visitPublicRoute(page, '/');
      await expect(page.locator('html')).toHaveClass(/reader-motion-reduce/);
      const candy = page.getByTestId('collectible-ember-toffee');
      await expect(candy).toHaveCSS('animation-name', 'none');
      // Shared reader styles preserve end-state events with a one-microsecond
      // transition. Enforce no perceptible animation rather than an exact zero.
      for (const control of [candy, lanternLauncher(page, 0)]) {
        const duration = await control.evaluate(element => getComputedStyle(element).transitionDuration);
        const seconds = duration.split(',').map(value => (
          parseFloat(value) * (value.trim().endsWith('ms') ? 0.001 : 1)
        ));
        expect(seconds.every(value => value <= 0.001)).toBe(true);
      }
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
        .toBe(source === 'system');
      await candy.click();
      await expect(lanternLauncher(page, 1)).toBeVisible();
      await openLantern(page, 1);
    });
  }

  test('excludes preview, administrative, authentication, profile, and Core OS surfaces', async ({page}) => {
    test.setTimeout(60_000);
    const routes = [
      '/blog/preview/scary-christmas-regression-token',
      '/admin/cms',
      '/admin/access-denied',
      '/login?redirectUrl=%2Fadmin%2Fcms',
      '/profile',
      '/os',
    ];
    for (const route of routes) {
      await page.goto(route, {waitUntil: 'domcontentloaded'});
      await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 15_000});
      if (route === '/admin/cms' || route === '/profile') {
        await expect(page).toHaveURL(/\/login\?redirectUrl=/);
        await expect(page.getByRole('heading', {name: 'Login', exact: true})).toBeVisible();
      }
      if (route === '/os') {
        await expect(page).toHaveURL(/\/(?:login|os-device-required)(?:\?|$)/);
      }
      await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
      await expect(page.getByRole('button', {name: /Open your lantern:/})).toHaveCount(0);
      await expect(page.getByRole('button', {name: 'Bring back Scary Christmas', exact: true})).toHaveCount(0);
      await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(0);
      await expect(page.getByRole('dialog', {name: 'Your lantern', exact: true})).toHaveCount(0);
      await expect(page.getByTestId('seasonal-soundtrack')).toHaveCount(0);
      await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
    }
  });
});
