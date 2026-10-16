import {expect, test} from '@playwright/test';

for (const theme of ['light', 'dark'] as const) {
  test(`Mac login and registration stay readable with ${theme} theme and autofill`, async ({page, context}) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.addInitScript(mode => {
      // The init script also runs in opaque browser/Firebase startup frames.
      try { localStorage.setItem('colinmichaels-site-theme', mode); } catch { /* No storage in opaque frames. */ }
    }, theme);
    await page.goto('/login');
    await expect(page).toHaveTitle('Login | ColinMichaels.com');
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    await expect(page.getByRole('heading', {name: 'Login', exact: true})).toBeVisible();

    // Chromium's native autofill pseudo-state exercises the real CSS cascade,
    // including saved-password styling, without using real account credentials.
    const cdp = await context.newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const {root} = await cdp.send('DOM.getDocument');

    async function checkField(selector: string, value: string) {
      const field = page.locator(selector);
      await field.fill(value);
      await expect(field).toHaveValue(value);
      const {nodeId} = await cdp.send('DOM.querySelector', {nodeId: root.nodeId, selector});
      await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: ['autofill']});
      for (const state of ['focus', 'blur', 'hover'] as const) {
        await field[state]();
        const paint = await field.evaluate(element => {
          const style = getComputedStyle(element);
          return {
            autofilled: element.matches(':autofill'),
            fill: style.webkitTextFillColor,
            shadow: style.boxShadow,
          };
        });
        expect(paint.autofilled).toBe(true);
        // A large OUTER shadow paints over sibling inputs and provider controls.
        // Small focus rings remain allowed; filled text must stay light on the OS surface.
        const shadows = paint.shadow.split(/,(?![^()]*\))/);
        for (const shadow of shadows.filter(value => !value.includes('inset'))) {
          const lengths = [...shadow.matchAll(/(-?[\d.]+)px/g)].map(match => Number(match[1]));
          expect(Math.abs(lengths[3] ?? 0), paint.shadow).toBeLessThanOrEqual(8);
        }
        const channels = paint.fill.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
        expect(channels.length).toBe(3);
        expect(Math.min(...channels), paint.fill).toBeGreaterThan(200);
        await expect(field).toHaveValue(value);
      }
      await expect(page.getByRole('button', {name: /with Google/})).toBeVisible();
      await expect(page.getByRole('button', {name: /with Facebook/})).toBeVisible();
    }

    await checkField('#email', 'reader@example.com');
    await checkField('#password', 'ExampleOnly123!');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Forgot password?'})).toBeEnabled();
    await page.getByRole('button', {name: 'Need an account? Register'}).click();
    await checkField('#displayName', 'Example Reader');
    await checkField('#registerEmail', 'reader@example.com');
    await checkField('#registerPassword', 'ExampleOnly123!');
    await checkField('#confirmPassword', 'ExampleOnly123!');
    await expect(page.getByRole('button', {name: 'Register', exact: true})).toBeEnabled();
    await expect(page.getByRole('button', {name: 'Sign up with Google'})).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(runtimeErrors).toEqual([]);
  });
}
