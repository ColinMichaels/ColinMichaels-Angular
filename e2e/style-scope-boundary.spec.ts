import {expect, test} from '@playwright/test';

test.describe('public and Core OS style ownership', () => {
  test('assigns one route scope and contains Core OS control globals', async ({page}) => {
    test.setTimeout(60_000);
    await page.goto('/');

    await expect(page.getByRole('heading', {
      level: 1,
      name: 'Cool gadgets, useful tech, and internet finds',
    })).toBeVisible({timeout: 20_000});

    const publicRoot = page.locator('app-root');
    await expect(publicRoot).toHaveClass(/site-theme-scope/);
    await expect(publicRoot).not.toHaveClass(/core-os-scope/);

    const publicMacControl = await page.evaluate(() => {
      const root = document.querySelector('app-root');
      const control = document.createElement('button');
      control.className = 'mac-button';
      root?.append(control);
      const style = getComputedStyle(control);
      const metrics = {
        paddingInline: style.paddingInline,
        backgroundColor: style.backgroundColor,
      };
      control.remove();
      return metrics;
    });

    expect(publicMacControl.paddingInline).toBe('0px');
    expect(publicMacControl.backgroundColor).toBe('rgba(0, 0, 0, 0)');

    await page.goto('/login?redirectUrl=%2Fos');
    await expect(page.getByRole('heading', {level: 2, name: 'Login'})).toBeVisible({timeout: 20_000});

    const osRoot = page.locator('app-root');
    await expect(osRoot).toHaveClass(/core-os-scope/);
    await expect(osRoot).not.toHaveClass(/site-theme-scope/);

    const osMacControl = await page.evaluate(() => {
      const root = document.querySelector('app-root');
      const control = document.createElement('button');
      control.className = 'mac-button';
      root?.append(control);
      const style = getComputedStyle(control);
      const metrics = {
        paddingInline: style.paddingInline,
        backgroundColor: style.backgroundColor,
      };
      control.remove();
      return metrics;
    });

    expect(osMacControl.paddingInline).toBe('12px');
    expect(osMacControl.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
