import {expect, test} from '@playwright/test';
import {randomUUID} from 'node:crypto';

// Browser plugin not available: use the repository's Playwright workflow.
// This test signs in through the real UI against local emulators only.
for (const theme of ['light', 'dark'] as const) {
  test(`Lost Signal uses Terminal and Finder and survives reload (${theme})`, async ({page, isMobile}, testInfo) => {
    test.skip(isMobile, 'The existing OS capability gate requires a desktop pointer and viewport.');
    test.setTimeout(90_000);
    page.setDefaultTimeout(8_000);
    await page.setViewportSize(theme === 'light' ? {width: 1440, height: 1000} : {width: 1024, height: 640});
    await page.emulateMedia({reducedMotion: 'reduce'});
    const email = `terminal-${randomUUID()}@example.invalid`;
    const password = `Local-${randomUUID()}!`;
    const endpoint = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts';
    const created = await page.request.post(`${endpoint}:signUp?key=local-terminal`, {
      data: {email, password, returnSecureToken: true},
    });
    expect(created.ok(), 'Local Auth emulator is required').toBe(true);
    const account = await created.json() as {idToken: string; localId: string};
    const errors: string[] = [];
    const consoleMessages: {type: string; text: string; url?: string}[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (['warning', 'error'].includes(message.type())) consoleMessages.push({
        type: message.type(), text: message.text(), url: message.location().url,
      });
    });
    await page.route(/^https:\/\/(identitytoolkit|securetoken)\.googleapis\.com\//, route => route.abort());
    await page.addInitScript(mode => {
      try { localStorage.setItem('colinmichaels-site-theme', mode); } catch { /* Opaque frames have no storage. */ }
    }, theme);
    try {
      await page.goto('/login?redirectUrl=%2Fos');
      await page.locator('#email').fill(email);
      await page.locator('#password').fill(password);
      await page.locator('form button[type="submit"]').click();
      await expect(page).toHaveURL(/\/os$/);
      const terminal = page.locator('app-terminal');
      const input = terminal.getByRole('textbox', {name: 'Terminal command'});
      await expect(input).toBeVisible();
      await expect(terminal).toContainText('ColinOS Terminal');
      const window = page.locator('app-window').filter({has: terminal});
      async function command(value: string) {
        await window.locator('.app-window-header .title').click();
        await input.fill(value);
        await input.press('Enter');
        if (value !== 'clear') await expect(terminal.locator('.command').last()).toContainText(value);
        await expect(terminal.locator('form')).toHaveAttribute('aria-busy', 'false');
      }
      await command('adventure');
      await expect(terminal).toContainText('Read README.txt');
      await command('cat README.txt');
      await expect(terminal).toContainText('Check logs/system.log');
      await command('ls -la');
      await expect(terminal.locator('pre').last()).toContainText('logs/');
      await expect(terminal.locator('pre').last()).toContainText('dr-xr-xr-x');
      await command('tree -a');
      await expect(terminal.locator('pre').last()).toContainText('message.txt');
      await command('find . -name "*.log" -type f');
      await expect(terminal.locator('pre').last()).toContainText('/logs/access.log');
      await command('grep -rin "contact lost" logs');
      await expect(terminal.locator('pre').last()).toContainText('system.log:4:');
      await command('cat logs/system.log | grep -i relay | tail -n 1');
      await expect(terminal.locator('pre').last()).toContainText('WARN relay station-7');
      await input.fill('cat logs/sys');
      await input.press('Tab');
      await expect(input).toHaveValue('cat logs/system.log');
      await input.press('Enter');
      await expect(terminal.locator('pre').last()).toContainText('virtual filesystem mounted');
      await page.screenshot({path: testInfo.outputPath(`shell-tools-${theme}.png`)});
      await command('open .');
      const finder = page.locator('app-finder-app');
      await expect(finder).toBeVisible();
      const finderBounds = await page.locator('app-window').filter({has: finder}).locator('.app-window').boundingBox();
      expect(finderBounds?.width).toBe(800);
      expect(finderBounds!.x + finderBounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(finderBounds!.y + finderBounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      await finder.locator('[data-finder-entry-id="lost-signal-v1-readme"]').dblclick();
      await expect(finder.getByRole('region', {name: 'File preview'})).toContainText('logs/system.log');
      await finder.getByRole('button', {name: 'Close file preview'}).click();
      await expect(finder.locator('[data-finder-entry-id="lost-signal-v1-readme"]')).toBeFocused();
      await finder.getByRole('button', {name: 'New Text File', exact: true}).click();
      const newText = finder.getByRole('dialog', {name: 'New Text File', exact: true});
      await newText.getByLabel('Name', {exact: true}).fill('case-notes.txt');
      await newText.getByRole('textbox', {name: 'Text contents'}).fill('The beacon is amber.\n');
      await newText.getByRole('button', {name: 'Create', exact: true}).click();
      await expect(newText).toHaveCount(0);
      const preview = finder.getByRole('region', {name: 'File preview'});
      await expect(preview).toContainText('amber');
      await preview.getByRole('button', {name: 'Edit', exact: true}).click();
      const editor = finder.getByRole('dialog', {name: 'Edit Text File', exact: true});
      await editor.getByRole('textbox', {name: 'Text contents'}).fill('The beacon is green.\n');
      await editor.getByRole('button', {name: 'Save', exact: true}).click();
      await expect(preview).toContainText('green');
      await finder.getByRole('searchbox', {name: 'Search this folder'}).fill('green');
      await expect(finder.locator('.finder-entry[role="option"]')).toHaveCount(0);
      await finder.getByRole('combobox', {name: 'Search matching'}).selectOption({label: 'Names and contents'});
      await expect(finder.locator('.finder-entry[role="option"]')).toHaveCount(1);
      await finder.locator('.finder-entry[role="option"]').click();
      await finder.getByRole('button', {name: 'Show in Folder', exact: true}).click();
      await expect(finder.getByRole('textbox', {name: 'Folder path'})).toHaveValue('/Documents/Lost Signal');
      await finder.getByRole('button', {name: 'Open Terminal here'}).click();
      await expect(input).toBeFocused();
      await command('cat case-notes.txt');
      await expect(terminal.locator('pre').last()).toContainText('beacon is green');
      await command('open .');
      await finder.locator('.finder-entry[role="option"]').filter({hasText: 'case-notes.txt'}).click();
      await finder.getByRole('button', {name: 'Rename', exact: true}).click();
      const rename = finder.getByRole('dialog', {name: 'Rename Item', exact: true});
      await rename.getByLabel('Name', {exact: true}).fill('field-notes.txt');
      await rename.getByRole('button', {name: 'Rename', exact: true}).click();
      await expect(finder.locator('.finder-entry[role="option"]').filter({hasText: 'field-notes.txt'})).toBeVisible();
      await finder.getByRole('button', {name: 'Move…', exact: true}).click();
      const move = finder.getByRole('dialog', {name: 'Move Item', exact: true});
      await move.getByLabel('Destination').selectOption({label: '/Documents/Lost Signal/logs'});
      await move.getByRole('button', {name: 'Move', exact: true}).click();
      await expect(move).toHaveCount(0);
      await finder.getByRole('textbox', {name: 'Folder path'}).fill('/Documents/Lost Signal/logs');
      await finder.getByRole('button', {name: 'Go', exact: true}).click();
      await expect(finder.getByRole('textbox', {name: 'Folder path'})).toHaveValue('/Documents/Lost Signal/logs');
      await finder.locator('.finder-entry[role="option"]').filter({hasText: 'field-notes.txt'}).click();
      await finder.locator('header').getByRole('button', {name: 'Trash', exact: true}).click();
      await expect(finder.locator('.finder-entry[role="option"]').filter({hasText: 'field-notes.txt'})).toHaveCount(0);
      await finder.getByRole('button', {name: 'Undo Move to Trash', exact: true}).click();
      await expect(finder.locator('.finder-entry[role="option"]').filter({hasText: 'field-notes.txt'})).toBeVisible();
      await finder.getByRole('button', {name: 'Open Terminal here'}).click();
      await command('pwd');
      await expect(terminal.locator('pre').last()).toHaveText('/Documents/Lost Signal/logs');
      await command('cat field-notes.txt');
      await expect(terminal.locator('pre').last()).toContainText('beacon is green');
      await command('open .');
      await finder.getByRole('button', {name: 'Go to parent folder'}).click();
      await finder.locator('[data-finder-entry-id="lost-signal-v1-logs"]').click();
      await finder.getByRole('button', {name: 'Rename', exact: true}).click();
      await rename.getByLabel('Name', {exact: true}).fill('records');
      await rename.getByRole('button', {name: 'Rename', exact: true}).click();
      await finder.locator('.finder-entry[role="option"]').filter({hasText: 'records'}).dblclick();
      await expect(finder.getByRole('textbox', {name: 'Folder path'})).toHaveValue('/Documents/Lost Signal/records');
      await page.screenshot({path: testInfo.outputPath(`finder-files-${theme}.png`)});
      await page.getByRole('button', {name: /Minimize Finder.*to Dock/}).click();
      await command('pwd');
      await expect(terminal.locator('pre').last()).toHaveText('/Documents/Lost Signal/records');
      await command('cat field-notes.txt');
      await expect(terminal.locator('pre').last()).toContainText('beacon is green');
      await command('open .');
      await finder.getByRole('button', {name: 'Undo Rename', exact: true}).click();
      await expect(finder.getByRole('textbox', {name: 'Folder path'})).toHaveValue('/Documents/Lost Signal/logs');
      await finder.getByRole('button', {name: 'Go to parent folder'}).click();
      await finder.locator('[data-finder-entry-id="lost-signal-v1-station"]').dblclick();
      await finder.locator('[data-finder-entry-id="lost-signal-v1-route"]').focus();
      await page.keyboard.press('Enter');
      await expect(finder.getByRole('region', {name: 'File preview'})).toContainText('Use ls -a');
      await expect(finder.locator('[data-finder-entry-id="lost-signal-v1-relay"]')).toHaveCount(0);
      await finder.getByRole('button', {name: 'Hidden files', exact: true}).click();
      await expect(finder.locator('[data-finder-entry-id="lost-signal-v1-relay"]')).toBeVisible();
      await page.screenshot({path: testInfo.outputPath(`finder-hidden-${theme}.png`)});
      // Hide Finder through the existing window control before returning to Terminal.
      await page.getByRole('button', {name: /Minimize Finder.*to Dock/}).click();
      await command('cd ..');
      await command('cd station-7');
      await command('ls -a');
      await expect(terminal.locator('pre').last()).toContainText('.relay/');
      await command('cd .relay');
      await command('cat message.txt');
      await expect(terminal.locator('pre').last()).toContainText('SIGNAL RECOVERED');
      await command('open .');
      await finder.locator('[data-finder-entry-id="lost-signal-v1-message"]').dblclick();
      await expect(finder.getByRole('region', {name: 'File preview'})).toContainText('Lost Signal complete');
      await page.screenshot({path: testInfo.outputPath(`lost-signal-${theme}.png`)});
      await page.reload();
      await expect(input).toBeVisible();
      await command('adventure');
      await command('ls');
      await expect(terminal.locator('pre').last()).toHaveText('logs/\nstation-7/\nREADME.txt');
      await command('cat logs/field-notes.txt');
      await expect(terminal.locator('pre').last()).toContainText('beacon is green');
      await command('cat station-7/.relay/message.txt');
      await expect(terminal.locator('pre').last()).toContainText('Lost Signal complete');
      const dimensions = await window.locator('.app-window').boundingBox();
      expect(dimensions?.height).toBe(420);
      await page.screenshot({path: testInfo.outputPath(`terminal-${theme}.png`)});
      await input.fill('draft command');
      await input.press('ArrowUp');
      await expect(input).toHaveValue('cat station-7/.relay/message.txt');
      await input.press('ArrowDown');
      await expect(input).toHaveValue('draft command');
      await input.fill('');
      await input.press('Meta+k');
      await expect(terminal.locator('.command')).toHaveCount(0);
      expect(errors).toEqual([]);
      // Local-only provider baselines stay visible in the attached console evidence.
      // Fail on any other console warning/error, including application regressions.
      const unexpected = consoleMessages.filter(message => {
        const url = message.url ? new URL(message.url) : undefined;
        const appCheckResource = url?.hostname === 'content-firebaseappcheck.googleapis.com'
          && url.pathname.endsWith(':exchangeDebugToken')
          && message.text === 'Failed to load resource: the server responded with a status of 403 ()';
        const appCheckWarning = message.type === 'warning'
          && /@firebase\/auth:.*Error while retrieving App Check token:.*HTTP status: 403\./.test(message.text);
        const bootstrapResource = message.url === 'http://127.0.0.1:5001/colinmichaels/us-east1/bootstrapUserProfile'
          && message.text === 'Failed to load resource: net::ERR_CONNECTION_REFUSED';
        const bootstrapWarning = message.text === '[WARN] User profile bootstrap failed: (error=FirebaseError: internal [0])';
        return !(appCheckResource || appCheckWarning || bootstrapResource || bootstrapWarning);
      });
      await testInfo.attach('console', {body: JSON.stringify(consoleMessages, null, 2), contentType: 'application/json'});
      expect(unexpected, 'Unexpected browser warnings/errors').toEqual([]);
      expect((await window.locator('.app-window').boundingBox())?.height).toBe(420);
    } catch (error) {
      await page.screenshot({path: testInfo.outputPath(`finder-failure-${theme}.png`)}).catch(() => undefined);
      throw error;
    } finally {
      await page.close();
      const removed = await page.request.post(`${endpoint}:delete?key=local-terminal`, {data: {idToken: account.idToken}, timeout: 10_000});
      expect(removed.ok()).toBe(true);
      const profile = await page.request.delete(`http://127.0.0.1:8080/v1/projects/colinmichaels/databases/(default)/documents/users/${account.localId}`, {
        headers: {Authorization: 'Bearer owner'},
      });
      expect([200, 404]).toContain(profile.status());
    }
  });
}

test('keeps the OS device explanation on phone-sized touch devices', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Phone capability-gate check.');
  await page.goto('/os');
  await expect(page).toHaveURL(/\/os-device-required(?:\?|$)/);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('app-terminal')).toHaveCount(0);
});
