import {expect, Page, test} from '@playwright/test';

import {SCARY_CHRISTMAS_CANDIES} from '../src/app/features/scary-christmas/scary-christmas.config';
import {chooseEdition} from '../src/app/features/seasonal/seasonal.config';
import {suppressMembershipCampaign} from './support/public-reader-state';

async function visit(page: Page, route: string): Promise<void> {
  await page.goto(route, {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#cm-initial-loader')).toBeHidden({timeout: 15_000});
  await expect(page.locator('app-root')).toHaveClass(/seasonal-theme/);
}

async function gadgetSlot(page: Page): Promise<string | null> {
  const candy = page.getByTestId('collectible-witchy-wonder');
  await expect(candy).toHaveCount(1);
  return candy.evaluate(element => element.closest('app-seasonal-collectibles')!.getAttribute('data-seasonal-hideout'));
}

test.describe('Seasonal finds within existing content', () => {
  test.beforeEach(async ({page}) => {
    await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
    test.skip(chooseEdition('/', new Date('2026-10-15T12:00:00Z'))?.id !== 'scary-christmas-2026',
      'Requires the owner-approved Halloween main-site hunt.');
    await suppressMembershipCampaign(page);
  });

  test('keeps all six hiding routes reachable without changing content layout', async ({page}, testInfo) => {
    test.setTimeout(90_000);
    const applicationErrors: string[] = [];
    page.on('pageerror', error => applicationErrors.push(error.message));
    for (const route of new Set(SCARY_CHRISTMAS_CANDIES.map(item => item.route))) {
      await visit(page, route);
      const candies = SCARY_CHRISTMAS_CANDIES.filter(item => item.route === route);
      await expect(page.locator('[data-testid^="collectible-"]')).toHaveCount(candies.length);
      const slots: string[] = [];
      for (const item of candies) {
        const candy = page.getByTestId(`collectible-${item.id}`);
        await candy.click({trial: true});
        await expect(candy).toBeInViewport();
        const box = (await candy.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        const visual = (await candy.locator('img').boundingBox())!;
        expect(visual.width).toBeLessThan(36);
        expect(visual.height).toBeLessThan(36);
        expect(await candy.evaluate(element => {
          const r = element.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return hit === element || !!hit && element.contains(hit);
        })).toBe(true);
        slots.push((await candy.evaluate(element => element.parentElement!.getAttribute('data-seasonal-hideout')))!);
        if (route.startsWith('/topics/')) {
          const hero = (await page.locator('app-topic-hub-hero').boundingBox())!;
          expect(box.y).toBeGreaterThanOrEqual(hero.y + hero.height);
        }
      }
      expect(new Set(slots).size).toBe(candies.length);
      const shift = await page.evaluate(() => {
        const elements = [...document.querySelectorAll('app-site-header, main h1, #topic-posts, #topic-guide, app-site-footer')];
        const measure = () => elements.map(element => {
          const r = element.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        });
        const before = measure();
        const targets = [...document.querySelectorAll<HTMLElement>('app-seasonal-collectibles')];
        targets.forEach(element => { element.style.display = 'none'; });
        const after = measure();
        targets.forEach(element => { element.style.removeProperty('display'); });
        return {before, after};
      });
      expect(shift.after).toEqual(shift.before);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (route === '/topics/gadgets-toys') {
        await testInfo.attach('find-among-topic-content', {body: await page.screenshot(), contentType: 'image/png'});
      }
    }
    expect(applicationErrors).toEqual([]);
  });

  test('varies the content area on return and stays put when opening a guide', async ({page}) => {
    await visit(page, '/topics/gadgets-toys');
    const seen = [await gadgetSlot(page)];
    await page.locator('app-topic-hub-hero a[href$="#topic-guide"]').click();
    await expect(page).toHaveURL(/#topic-guide$/);
    expect(await gadgetSlot(page)).toBe(seen[0]);
    for (let visitIndex = 0; visitIndex < 2; visitIndex++) {
      await page.locator('.topic-hub-related-grid a[href="/topics/drones-fpv"]').click();
      await expect(page).toHaveURL(/\/topics\/drones-fpv$/);
      await expect(page.getByTestId('collectible-sky-sour')).toHaveCount(1);
      await page.locator('.topic-hub-related-grid a[href="/topics/gadgets-toys"]').click();
      await expect(page).toHaveURL(/\/topics\/gadgets-toys$/);
      seen.push(await gadgetSlot(page));
    }
    expect(new Set(seen).size).toBe(3);
    await page.getByTestId('collectible-witchy-wonder').scrollIntoViewIfNeeded();
    const candy = page.getByTestId('collectible-witchy-wonder');
    await candy.focus();
    await page.keyboard.press('Enter');
    await expect(candy).toHaveCount(0);
    await expect(page.locator('#seasonal-lantern-toggle')).toBeFocused();
    await expect(page.getByRole('button', {name: 'Open your lantern: 1 of 8 candies', exact: true})).toBeVisible();
  });

  test('keeps the other homepage find in its content area after a keyboard or touch collection', async ({page, isMobile}) => {
    await visit(page, '/');
    const remaining = page.getByTestId('collectible-moonlit-mint');
    const slot = await remaining.evaluate(element => element.parentElement!.getAttribute('data-seasonal-hideout'));
    const first = page.getByTestId('collectible-ember-toffee');
    await first.scrollIntoViewIfNeeded();
    if (isMobile) await first.tap();
    else { await first.focus(); await page.keyboard.press('Enter'); }
    await expect(first).toHaveCount(0);
    await expect(page.locator('#seasonal-lantern-toggle')).toBeFocused();
    expect(await remaining.evaluate(element => element.parentElement!.getAttribute('data-seasonal-hideout'))).toBe(slot);
  });
});
