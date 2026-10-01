import {expect, test} from '@playwright/test';

import {suppressMembershipCampaign} from './support/public-reader-state';

test.describe('Holiday schedule', () => {
  test.beforeEach(async ({page}) => {
    await suppressMembershipCampaign(page);
    await page.clock.setFixedTime(new Date('2026-10-01T00:00:00.000Z'));
    await page.route('**/getPublicPublishingSchedule', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({result: {serverNow: '2026-10-01T00:00:00.000Z', entries: []}}),
    }));
  });

  test('shows celebration windows without linking to future content', async ({page}) => {
    await page.goto('/schedule');
    const calendar = page.getByTestId('holiday-calendar');
    await expect(calendar.getByRole('heading', {name: 'On the holiday calendar'})).toBeVisible();
    await expect(calendar.locator('article')).toHaveCount(7);
    await expect(calendar.getByRole('link')).toHaveCount(0);
    await calendar.getByRole('button', {name: 'Show the full holiday calendar'}).click();
    await expect(calendar.locator('article')).toHaveCount(42);
    await expect(calendar.getByRole('link')).toHaveCount(0);
    await expect(calendar.getByText('Planned celebration', {exact: true})).toHaveCount(42);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });

  test('keeps unresolved celebration dates separate from article releases', async ({page}) => {
    await page.goto('/schedule');
    const calendar = page.getByTestId('holiday-calendar');
    await calendar.getByRole('searchbox', {name: 'Find a holiday'}).fill('Vesak');
    await expect(calendar.locator('article')).toHaveCount(1);
    await expect(calendar.getByText('Dates to be confirmed')).toBeVisible();
    await expect(calendar.getByRole('link')).toHaveCount(0);
    await calendar.getByRole('searchbox', {name: 'Find a holiday'}).fill('nothing-matches');
    await expect(calendar.getByText('No holidays found. Try a celebration name or year.')).toBeVisible();
    await calendar.getByRole('searchbox', {name: 'Find a holiday'}).fill('');
    await expect(calendar.locator('article')).toHaveCount(7);
  });

  test('opens the posting schedule from the existing seasonal archive', async ({page}) => {
    await page.goto('/archive/seasons');
    await page.getByRole('link', {name: 'See what’s coming next'}).click();
    await expect(page).toHaveURL(/\/schedule$/);
    await expect(page.getByTestId('holiday-calendar')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
