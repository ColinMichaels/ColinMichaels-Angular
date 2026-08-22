import {expect, test} from '@playwright/test';

const RETIRED_ROUTE_FRAGMENTS = [
  '/openai/chat',
  '/weather/current',
  '/weather/forecast',
] as const;

test.describe('inactive integration boundary', () => {
  test('keeps public and protected OS navigation off the retired proxy', async ({page}, testInfo) => {
    const retiredRequests: string[] = [];
    page.on('request', request => {
      if (RETIRED_ROUTE_FRAGMENTS.some(fragment => request.url().includes(fragment))) {
        retiredRequests.push(request.url());
      }
    });

    await page.goto('/');
    await expect(page.getByRole('heading', {
      level: 1,
      name: 'Cool gadgets, useful tech, and internet finds',
    })).toBeVisible({timeout: 20_000});

    await page.goto('/os/weather-app');
    if (testInfo.project.name === 'mobile-chromium') {
      await expect(page).toHaveURL(/\/os-device-required\?returnUrl=%2Fos%2Fweather-app$/);
      await expect(page.getByRole('heading', {name: 'The OS needs a little more room.'})).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/login\?redirectUrl=%2Fos%2Fweather-app$/);
      await expect(page.getByRole('heading', {name: 'Login'})).toBeVisible();
    }

    expect(retiredRequests).toEqual([]);
  });
});
