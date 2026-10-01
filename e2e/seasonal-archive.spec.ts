import {expect, Locator, Page, test} from '@playwright/test';

import {SEASONAL_EDITIONS, getSeasonalEdition} from '../src/app/features/seasonal/seasonal.catalog';
import {SEASONAL_PREFERENCE_STORAGE_KEY, seasonalStorageKey} from '../src/app/features/seasonal/seasonal.config';
import {SeasonalEdition} from '../src/app/features/seasonal/seasonal.models';
import {suppressMembershipCampaign} from './support/public-reader-state';

const halloween = getSeasonalEdition('scary-christmas-2026')!;
const thanksgiving = getSeasonalEdition('thanksgiving-2026')!;
const kwanzaa = getSeasonalEdition('kwanzaa-2026')!;
const ORIGINAL_EDITION_IDS = ['scary-christmas-2026', 'thanksgiving-2026', 'hanukkah-2026',
  'winter-solstice-2026', 'christmas-2026', 'kwanzaa-2026', 'new-year-2027'];
const originalEditions = ORIGINAL_EDITION_IDS.map(id => getSeasonalEdition(id)!);

function archiveUrl(edition: SeasonalEdition): string {
  return `/archive/seasons/${edition.id}`;
}

function launcher(page: Page, edition: SeasonalEdition, count: number): Locator {
  return page.getByRole('button', {
    name: `Open your ${edition.collectorName}: ${count} of ${edition.items.length} ${edition.collectibleLabel}`,
    exact: true,
  });
}

async function visitArchive(page: Page, edition: SeasonalEdition): Promise<void> {
  await page.goto(archiveUrl(edition), {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 15_000});
  await expect(page.locator('app-root')).toHaveClass(/seasonal-theme/);
  await expect(page.locator('app-root')).toHaveAttribute('data-seasonal-theme', edition.theme);
}

async function switchArchive(page: Page, edition: SeasonalEdition): Promise<void> {
  await page.locator('.seasonal-edition-breadcrumb a[href="/archive/seasons"]').click();
  await expect(page.getByRole('heading', {name: 'Seasonal archive', exact: true})).toBeVisible();
  await page.getByRole('link', {name: `Explore ${edition.holidayLabel} ${edition.year}`, exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`${archiveUrl(edition)}$`));
  await expect(page.locator('app-root')).toHaveAttribute('data-seasonal-theme', edition.theme);
}

async function openLantern(page: Page, edition: SeasonalEdition, count: number): Promise<Locator> {
  await launcher(page, edition, count).click();
  const dialog = page.getByRole('dialog', {name: 'Your lantern', exact: true});
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openThemeOptions(page: Page): Promise<Locator> {
  await page.getByRole('button', {name: 'Holiday options', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Seasonal options', exact: true});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Season', {exact: true})).toHaveCount(0);
  return dialog;
}

async function withLocalRegisteredAccount(page: Page, run: () => Promise<void>): Promise<void> {
  test.setTimeout(90_000);
  const emulator = 'http://127.0.0.1:9099';
  const endpoint = `${emulator}/identitytoolkit.googleapis.com/v1/accounts`;
  const email = `seasonal-options-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
  const password = `Local-seasonal-${Math.random().toString(36).slice(2)}!`;
  const created = await page.request.post(`${endpoint}:signUp?key=local-seasonal-e2e`, {
    data: {email, password, returnSecureToken: true},
  });
  expect(created.ok(), 'The registered-account fixture must use the local Firebase Auth emulator').toBe(true);
  const account = await created.json() as {idToken: string; localId: string};
  const token = JSON.parse(atob(account.idToken.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))) as {
    aud: string; firebase: {sign_in_provider: string};
  };
  expect(token.aud).toBe('colinmichaels');
  expect(token.firebase.sign_in_provider).toBe('password');
  // Production Auth requests are blocked even if a preview is accidentally configured against cloud Auth.
  await page.route(/^https:\/\/(identitytoolkit|securetoken)\.googleapis\.com\//, route => route.abort());
  try {
    await page.goto(`/login?redirectUrl=${encodeURIComponent(archiveUrl(thanksgiving))}`, {waitUntil: 'domcontentloaded'});
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    const signedIn = page.waitForResponse(response => response.url().startsWith(emulator)
      && response.url().includes('accounts:signInWithPassword'));
    await page.locator('form button[type="submit"]').click();
    expect((await signedIn).ok()).toBe(true);
    await expect(page).toHaveURL(new RegExp(`${archiveUrl(thanksgiving)}$`));
    await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toBeVisible();
    await run();
  } finally {
    await page.close();
    const removed = await page.request.post(`${endpoint}:delete?key=local-seasonal-e2e`, {
      data: {idToken: account.idToken},
    });
    expect(removed.ok(), 'Remove only the local Auth fixture created by this test').toBe(true);
    const profile = await page.request.delete(`http://127.0.0.1:8080/v1/projects/colinmichaels/databases/(default)/documents/users/${account.localId}`, {
      headers: {Authorization: 'Bearer owner'},
    });
    expect([200, 404]).toContain(profile.status());
  }
}

async function storedIds(page: Page, edition: SeasonalEdition): Promise<string[]> {
  return page.evaluate(key => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).collectedIds : [];
  }, seasonalStorageKey(edition.id));
}

async function expectImageLoaded(image: Locator, src: string): Promise<void> {
  await expect(image).toHaveAttribute('src', src);
  await expect.poll(() => image.evaluate(element => {
    const img = element as HTMLImageElement;
    return img.complete && img.naturalWidth > 0;
  }), {timeout: 15_000}).toBe(true);
}

test.describe('Seasonal archive', () => {
  test.beforeEach(async ({page}) => {
    await page.clock.setFixedTime(new Date('2026-09-30T12:00:00Z'));
    await suppressMembershipCampaign(page);
  });

  test('lists all known editions without starting an index hunt or exposing a visitor season chooser', async ({page}) => {
    await page.goto('/archive/seasons', {waitUntil: 'domcontentloaded'});
    await expect(page.getByRole('heading', {name: 'Seasonal archive', exact: true})).toBeVisible();
    await expect(page.locator('.seasonal-archive-row')).toHaveCount(SEASONAL_EDITIONS.length);
    await expect(page.locator('.seasonal-archive-action a[href^="/archive/seasons/"]'))
      .toHaveCount(SEASONAL_EDITIONS.length);
    for (const edition of SEASONAL_EDITIONS) {
      await expect(page.getByRole('link', {
        name: `Explore ${edition.holidayLabel} ${edition.year}`, exact: true,
      })).toHaveAttribute('href', archiveUrl(edition));
    }
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    await expect(page.getByRole('button', {name: /Open your lantern:/})).toHaveCount(0);
    await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
    await expect(page.getByLabel('Season', {exact: true})).toHaveCount(0);
    await page.getByRole('link', {name: 'Explore Thanksgiving 2026', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`${archiveUrl(thanksgiving)}$`));
    await expect(launcher(page, thanksgiving, 0)).toBeVisible();
    await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
    const options = await openLantern(page, thanksgiving, 0);
    await expect(options.locator('.seasonal-theme-settings')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(options).toBeHidden();
    await expect(launcher(page, thanksgiving, 0)).toBeFocused();
  });

  test('filters the archive by a holiday name, explains empty results, and restores the complete list', async ({page}) => {
    await page.goto('/archive/seasons', {waitUntil: 'domcontentloaded'});
    const search = page.getByLabel('Find a celebration', {exact: true});
    await search.fill('hAnUkKaH');
    await expect(page.locator('.seasonal-archive-row')).toHaveCount(2);
    for (const year of [2026, 2027]) {
      await expect(page.getByRole('link', {name: `Explore Hanukkah ${year}`, exact: true})).toBeVisible();
    }
    await search.fill('no-such-season-regression');
    await expect(page.locator('.seasonal-archive-row')).toHaveCount(0);
    await expect(page.getByText('No seasons found. Try a holiday name or year.', {exact: true})).toBeVisible();
    await search.fill('');
    await expect(page.locator('.seasonal-archive-row')).toHaveCount(SEASONAL_EDITIONS.length);
  });

  for (const edition of originalEditions) {
    test(`${edition.holidayLabel} loads its art and collection, and keeps clue navigation inside the edition`, async ({page}) => {
      await visitArchive(page, edition);
      await expect(page.getByRole('heading', {
        name: `${edition.titleLine1} ${edition.titleLine2}`, exact: true,
      })).toBeVisible();
      await expect(launcher(page, edition, 0)).toBeVisible();
      await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(edition.items.length);
      await expectImageLoaded(page.locator('.seasonal-banner-art'), edition.heroSrc);
      const first = edition.items[0];
      const collectible = page.getByTestId(`collectible-${first.id}`);
      await expectImageLoaded(collectible.locator('img'), edition.collectibleSrc);
      await expectImageLoaded(launcher(page, edition, 0).locator('img'), edition.collectorSrc);

      const dialog = await openLantern(page, edition, 0);
      await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
      await expect(dialog.locator('.seasonal-theme-settings')).toHaveCount(0);
      await expect(page.getByTestId('seasonal-soundtrack')).toHaveCount(0);
      if (!edition.musicSrc) {
        await expect(dialog.getByRole('button', {name: edition.musicAction, exact: true})).toHaveCount(0);
        await expect(dialog.locator(`a[href="${edition.musicHref}"]`)).toBeVisible();
      }
      await dialog.getByRole('button', {name: 'Show clues', exact: true}).click();
      const clues = dialog.locator(`a[href^="${archiveUrl(edition)}#seasonal-item-"]`);
      await expect(clues).toHaveCount(edition.items.length);
      await dialog.locator(`a[href="${archiveUrl(edition)}#seasonal-item-${first.id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${archiveUrl(edition)}#seasonal-item-${first.id}$`));
      await expect(dialog).toBeHidden();
      await expect(page.locator(`#seasonal-item-${first.id}`)).toBeInViewport();
      await collectible.click();
      await expect(launcher(page, edition, 1)).toBeVisible();
      await expect(launcher(page, edition, 1)).toBeFocused();
      await expect(collectible).toHaveCount(0);
      expect(await storedIds(page, edition)).toEqual([first.id]);
    });
  }

  test('loads every catalog edition with correct metadata, bounded collections or reflection, and no automatic audio', async ({page}) => {
    test.setTimeout(300_000);
    const audioRequests: string[] = [];
    const soundtrackPaths = SEASONAL_EDITIONS.filter(edition => edition.musicSrc).map(edition => edition.musicSrc!);
    page.on('request', request => {
      if (soundtrackPaths.some(path => request.url().includes(path))) {
        audioRequests.push(request.url());
      }
    });
    for (const edition of SEASONAL_EDITIONS) {
      await test.step(edition.id, async () => {
        await visitArchive(page, edition);
        await expect(page.getByRole('heading', {
          name: `${edition.titleLine1} ${edition.titleLine2}`, exact: true,
        })).toBeVisible();
        await expect(page).toHaveTitle(`${edition.titleLine1} ${edition.titleLine2} | ColinMichaels.com`);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
        await expectImageLoaded(page.locator('.seasonal-banner-art'), edition.heroSrc);
        await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(edition.items.length);
        expect(edition.approvedForCalendar).toBe(edition.id === halloween.id);
        await expect(page.getByTestId('seasonal-soundtrack')).toHaveCount(0);
        await expect(page.getByLabel('Season', {exact: true})).toHaveCount(0);
        if (edition.interaction === 'reflect') {
          expect(edition.items).toHaveLength(0);
          await expect(page.getByRole('button', {name: /Open your lantern:/})).toHaveCount(0);
          await page.getByRole('button', {name: 'About this holiday', exact: true}).click();
          const about = page.getByRole('dialog', {name: 'About this season', exact: true});
          await expect(about).toBeVisible();
          await expect(about.locator('.seasonal-lantern-count, .seasonal-collection-slots')).toHaveCount(0);
          await expect(about.getByRole('button', {name: /Show clues|Reset hunt/})).toHaveCount(0);
          await about.getByRole('button', {name: 'Close seasonal options', exact: true}).click();
        } else {
          expect(edition.items.length).toBeGreaterThan(0);
          expect(edition.items.length).toBeLessThanOrEqual(8);
          await expect(launcher(page, edition, 0)).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
          .toBeLessThanOrEqual(1);
      });
    }
    expect(audioRequests).toEqual([]);
  });

  test('keeps public reading routes neutral and ignores legacy visitor-selected editions', async ({page}) => {
    await page.addInitScript(({key, progressKey}) => {
      localStorage.setItem(key, JSON.stringify({version: 1, editionId: 'thanksgiving-2026', disabled: false}));
      localStorage.setItem(progressKey, JSON.stringify({version: 1, enabled: true, collectedIds: ['thanksgiving-1']}));
    }, {key: SEASONAL_PREFERENCE_STORAGE_KEY, progressKey: seasonalStorageKey(thanksgiving.id)});
    for (const route of ['/', '/blog', '/topics/gadgets-toys', '/authors']) {
      await page.goto(route, {waitUntil: 'domcontentloaded'});
      await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 15_000});
      await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
      await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(0);
      await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
      await expect(page.getByRole('button', {name: /Open your lantern:|Bring back /})).toHaveCount(0);
      await expect(page.getByLabel('Season', {exact: true})).toHaveCount(0);
      await expect(page.getByTestId('seasonal-soundtrack')).toHaveCount(0);
    }
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    expect(await storedIds(page, thanksgiving)).toEqual(['thanksgiving-1']);
    await visitArchive(page, thanksgiving);
    await expect(launcher(page, thanksgiving, 1)).toBeVisible();
    await expect(page.getByTestId('collectible-thanksgiving-1')).toHaveCount(0);
  });

  test('browses explicit archive cards without changing the site calendar or offering a season dropdown', async ({page}) => {
    await visitArchive(page, halloween);
    const options = await openLantern(page, halloween, 0);
    await expect(options.getByLabel('Season', {exact: true})).toHaveCount(0);
    await expect(options.locator('.seasonal-theme-settings')).toHaveCount(0);
    await options.getByRole('button', {name: 'Close your lantern', exact: true}).click();
    const hanukkah = getSeasonalEdition('hanukkah-2026')!;
    await switchArchive(page, hanukkah);
    await expect(launcher(page, hanukkah, 0)).toBeVisible();
    await expect(page.getByLabel('Season', {exact: true})).toHaveCount(0);
    await page.goto('/', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), SEASONAL_PREFERENCE_STORAGE_KEY)).toBeNull();
  });

  test('preserves existing Halloween and independent archive progress through reload and neutral reading routes', async ({page}) => {
    await page.goto('/archive/seasons', {waitUntil: 'domcontentloaded'});
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({version: 1, enabled: true, collectedIds: ['ember-toffee']})), seasonalStorageKey(halloween.id));
    await visitArchive(page, halloween);
    await expect(launcher(page, halloween, 1)).toBeVisible();
    await expect(page.getByTestId('collectible-ember-toffee')).toHaveCount(0);
    await page.getByTestId('collectible-moonlit-mint').click();

    await switchArchive(page, thanksgiving);
    await expect(launcher(page, thanksgiving, 0)).toBeVisible();
    await page.getByTestId('collectible-thanksgiving-1').click();
    const dialog = await openLantern(page, thanksgiving, 1);
    await dialog.getByRole('button', {name: 'Keep exploring', exact: true}).click();
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(launcher(page, thanksgiving, 1)).toBeVisible();
    await expect(page.getByTestId('collectible-thanksgiving-1')).toHaveCount(0);

    await switchArchive(page, kwanzaa);
    await expect(launcher(page, kwanzaa, 0)).toBeVisible();
    await switchArchive(page, halloween);
    await expect(launcher(page, halloween, 2)).toBeVisible();
    expect(await storedIds(page, halloween)).toEqual(['ember-toffee', 'moonlit-mint']);
    expect(await storedIds(page, thanksgiving)).toEqual(['thanksgiving-1']);
    expect(await storedIds(page, kwanzaa)).toEqual([]);
    await page.goto('/', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    await expect(launcher(page, halloween, 2)).toHaveCount(0);
    expect(await storedIds(page, halloween)).toEqual(['ember-toffee', 'moonlit-mint']);
    await visitArchive(page, halloween);
    await expect(launcher(page, halloween, 2)).toBeVisible();
  });

  test('completes exactly seven Kwanzaa principles and resets only this edition after confirmation', async ({page}) => {
    await visitArchive(page, thanksgiving);
    await page.getByTestId('collectible-thanksgiving-1').click();
    await visitArchive(page, kwanzaa);
    let count = 0;
    for (const item of kwanzaa.items) {
      await expect(page.getByRole('heading', {name: item.name, exact: true})).toBeVisible();
      await page.getByTestId(`collectible-${item.id}`).click();
      count += 1;
      await expect(launcher(page, kwanzaa, count)).toBeVisible();
    }
    await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(0);
    const dialog = await openLantern(page, kwanzaa, 7);
    await expect(dialog.getByRole('heading', {name: kwanzaa.completionHeading, exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: 'Reset hunt', exact: true}).click();
    await dialog.getByRole('button', {name: 'Keep my collection', exact: true}).click();
    expect(await storedIds(page, kwanzaa)).toHaveLength(7);
    await dialog.getByRole('button', {name: 'Reset hunt', exact: true}).click();
    await dialog.getByRole('button', {name: 'Start over', exact: true}).click();
    await expect(dialog.getByRole('button', {name: 'Keep exploring', exact: true})).toBeFocused();
    await dialog.getByRole('button', {name: 'Keep exploring', exact: true}).click();
    await expect(launcher(page, kwanzaa, 0)).toBeVisible();
    await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(7);
    expect(await storedIds(page, kwanzaa)).toEqual([]);
    expect(await storedIds(page, thanksgiving)).toEqual(['thanksgiving-1']);
  });

  test('keeps Halloween art in its archive and sends listeners to Dreadnauts without a player', async ({page}) => {
    const musicRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('spooky-remix-new-lyrics.mp3')) musicRequests.push(request.url());
    });
    await visitArchive(page, halloween);
    await expect(page.locator('.seasonal-banner-art')).toBeVisible();
    await expect(page.getByRole('link', {name: 'Listen to the Dreadnauts', exact: true}))
      .toHaveAttribute('href', halloween.musicHref!);
    const dialog = await openLantern(page, halloween, 0);
    await expect(dialog.getByRole('link', {name: 'Listen to the Dreadnauts ↗', exact: true}))
      .toHaveAttribute('href', halloween.musicHref!);
    await expect(page.locator('audio')).toHaveCount(0);
    await expect(dialog.getByRole('button', {name: halloween.musicAction, exact: true})).toHaveCount(0);
    await dialog.getByRole('button', {name: 'Show clues', exact: true}).click();
    await dialog.locator(`a[href="${archiveUrl(halloween)}#seasonal-item-ember-toffee"]`).click();
    await expect(page).toHaveURL(new RegExp(`${archiveUrl(halloween)}#seasonal-item-ember-toffee$`));
    await expect(dialog).toBeHidden();
    expect(musicRequests).toEqual([]);
  });

  test('registered accounts retain global bypass through route changes and reload, then restore their collection', async ({page}) => {
    await withLocalRegisteredAccount(page, async () => {
    await visitArchive(page, thanksgiving);
    await page.getByTestId('collectible-thanksgiving-1').click();
    const dialog = await openLantern(page, thanksgiving, 1);
    await dialog.getByRole('button', {name: 'Use the normal design', exact: true}).click();
    const restore = page.getByRole('button', {name: 'Bring back Thanksgiving', exact: true});
    await expect(restore).toBeFocused();
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(0);
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(restore).toBeVisible();
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    await page.goto(archiveUrl(kwanzaa), {waitUntil: 'domcontentloaded'});
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    await expect(page.getByRole('button', {name: 'Bring back Kwanzaa', exact: true})).toBeVisible();
    await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(0);
    await page.goto('/blog', {waitUntil: 'domcontentloaded'});
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    await expect(page.getByRole('button', {name: /Bring back /})).toHaveCount(0);
    const options = await openThemeOptions(page);
    await expect(options.getByRole('button', {name: 'Use the normal design', exact: true})).toHaveCount(0);
    await options.getByRole('button', {name: "Use the site's holiday design", exact: true}).click();
    await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
    await expect(page.locator('#main-content')).toBeFocused();
    await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SEASONAL_PREFERENCE_STORAGE_KEY)).toEqual({version: 1, editionId: null, disabled: false});
    await page.goto(archiveUrl(thanksgiving), {waitUntil: 'domcontentloaded'});
    await expect(launcher(page, thanksgiving, 1)).toBeVisible();
    await expect(page.getByTestId('collectible-thanksgiving-1')).toHaveCount(0);
    expect(await storedIds(page, thanksgiving)).toEqual(['thanksgiving-1']);
    });
  });

  test('anonymous archives ignore stored account bypass and fake local identity while keeping public collecting and clues', async ({page}) => {
    await page.addInitScript(({preferenceKey, progressKey}) => {
      if (!localStorage.getItem(preferenceKey)) {
        localStorage.setItem(preferenceKey, JSON.stringify({version: 1, editionId: null, disabled: true}));
        localStorage.setItem(progressKey, JSON.stringify({version: 1, enabled: false, collectedIds: ['ember-toffee']}));
        localStorage.setItem('account.identity', JSON.stringify({uid: 'pretend-account', isAnonymous: false}));
      }
    }, {preferenceKey: SEASONAL_PREFERENCE_STORAGE_KEY, progressKey: seasonalStorageKey(halloween.id)});
    await visitArchive(page, halloween);
    await expect(launcher(page, halloween, 1)).toBeVisible();
    await expect(page.getByRole('button', {name: /Holiday options|Bring back /})).toHaveCount(0);
    await page.getByTestId('collectible-moonlit-mint').click();
    const dialog = await openLantern(page, halloween, 2);
    await expect(dialog.locator('.seasonal-theme-settings')).toHaveCount(0);
    await dialog.getByRole('button', {name: 'Show clues', exact: true}).click();
    await expect(dialog.locator('.seasonal-clue-list a')).toHaveCount(6);
    await dialog.getByRole('button', {name: 'Keep exploring', exact: true}).click();
    await page.reload({waitUntil: 'domcontentloaded'});
    await expect(launcher(page, halloween, 2)).toBeVisible();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SEASONAL_PREFERENCE_STORAGE_KEY))
      .toEqual({version: 1, editionId: null, disabled: true});
    expect(await storedIds(page, halloween)).toEqual(['ember-toffee', 'moonlit-mint']);
  });

  test('public reflection information remains available without account customization controls', async ({page}) => {
    const edition = getSeasonalEdition('memorial-day-2027')!;
    await visitArchive(page, edition);
    await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'About this holiday', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'About this season', exact: true});
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.seasonal-reflection-note')).toBeVisible();
    await expect(dialog.locator('.seasonal-theme-settings, .seasonal-collection-slots')).toHaveCount(0);
    await expect(dialog.getByRole('button', {name: /Show clues|Reset hunt|Use the normal design/})).toHaveCount(0);
    await dialog.getByRole('button', {name: 'Keep exploring', exact: true}).click();
    await expect(page.getByRole('button', {name: 'About this holiday', exact: true})).toBeFocused();
  });

  test('real local account sign-out closes options and restores anonymous design without erasing bypass or progress', async ({page, context}) => {
    await withLocalRegisteredAccount(page, async () => {
      await page.getByTestId('collectible-thanksgiving-1').click();
      let options = await openThemeOptions(page);
      await options.getByRole('button', {name: 'Use the normal design', exact: true}).click();
      await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
      options = await openThemeOptions(page);
      const signOutPage = await context.newPage();
      await signOutPage.goto('/logout', {waitUntil: 'domcontentloaded'});
      await expect(signOutPage).toHaveURL(/\/login(?:\?.*)?$/);
      await expect(options).toBeHidden();
      await expect(page.getByRole('button', {name: /Holiday options|Bring back /})).toHaveCount(0);
      await expect(page.locator('app-root')).toHaveClass(/seasonal-theme/);
      await expect(launcher(page, thanksgiving, 1)).toBeVisible();
      await expect(launcher(page, thanksgiving, 1)).toBeFocused();
      const publicDialog = await openLantern(page, thanksgiving, 1);
      await expect(publicDialog.locator('.seasonal-theme-settings')).toHaveCount(0);
      expect(await storedIds(page, thanksgiving)).toEqual(['thanksgiving-1']);
      expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SEASONAL_PREFERENCE_STORAGE_KEY))
        .toEqual({version: 1, editionId: null, disabled: true});
      await signOutPage.close();
    });
  });

  test('does not turn an unknown or nested archive identifier into a fallback seasonal experience', async ({page}) => {
    for (const route of ['/archive/seasons/unknown-edition', '/archive/seasons/thanksgiving-2026/nested']) {
      await page.goto(route, {waitUntil: 'domcontentloaded'});
      await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 15_000});
      await expect(page.locator('app-root')).not.toHaveClass(/seasonal-theme/);
      await expect(page.getByRole('button', {name: /Open your lantern:|Bring back /})).toHaveCount(0);
      await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(0);
      await expect(page.getByRole('dialog', {name: 'Your lantern', exact: true})).toHaveCount(0);
      await expect(page.getByTestId('seasonal-soundtrack')).toHaveCount(0);
      await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
      const huntKeys = [...SEASONAL_EDITIONS.map(edition => seasonalStorageKey(edition.id)), 'cm.unknown-edition.v1'];
      expect(await page.evaluate(keys => Object.keys(localStorage).filter(key => keys.includes(key)), huntKeys))
        .toEqual([]);
    }
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`fits the seven-token archive and clue drawer on a 320-pixel screen in ${theme} mode`, async ({page}) => {
      await page.setViewportSize({width: 320, height: 740});
      await page.addInitScript(mode => localStorage.setItem('colinmichaels-site-theme', mode), theme);
      await visitArchive(page, kwanzaa);
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
      await expect(page.getByRole('button', {name: 'Holiday options', exact: true})).toHaveCount(0);
      for (const target of [launcher(page, kwanzaa, 0), page.getByTestId('collectible-kwanzaa-1')]) {
        const box = await target.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
        .toBeLessThanOrEqual(1);
      const dialog = await openLantern(page, kwanzaa, 0);
      await dialog.getByRole('button', {name: 'Show clues', exact: true}).click();
      const dimensions = await dialog.evaluate(element => ({
        scroll: element.scrollWidth, client: element.clientWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
      const box = await dialog.boundingBox();
      const close = dialog.getByRole('button', {name: 'Close your lantern', exact: true});
      const closeBox = await close.boundingBox();
      expect(box).not.toBeNull();
      expect(closeBox).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
      expect(closeBox!.x).toBeGreaterThanOrEqual(box!.x);
      expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(box!.x + box!.width);
      expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(740);
      await close.click();
      await expect(launcher(page, kwanzaa, 0)).toBeFocused();
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
    });
  }
});
