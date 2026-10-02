import {expect, Page, Route, test} from '@playwright/test';
import {suppressMembershipCampaign} from './support/public-reader-state';

const serverNow = '2026-10-01T12:00:00.000Z';
const artwork = '/assets/images/backgrounds/night.webp';
const locked = {id: 'next-post', slug: 'next-post', title: 'A new horizon', excerpt: 'A fixture announcement, with the article still private.',
  coverImage: artwork, publishedAt: '2026-10-15T12:00:00.000Z', earlyAccessAt: '2026-10-01T12:00:00.000Z', status: 'scheduled', access: 'locked'};
const published = {...locked, id: 'published-post', slug: 'published-post', title: 'An idea ready to read', status: 'published', access: 'public'};
const earlyPost = {id: 'next-post', slug: 'next-post', title: locked.title, excerpt: 'A member reading fixture.', coverImage: artwork,
  author: {name: 'Colin Michaels'}, categories: ['Projects'], tags: [], status: 'scheduled',
  seo: {title: locked.title, description: 'A member reading fixture.'}, contentFormat: 'editorjs',
  blocks: [{id: 'private-intro', type: 'paragraph', data: {text: 'PRIVATE_READER_FIXTURE_BODY_7462'}}],
  createdAt: serverNow, updatedAt: serverNow, publishedAt: locked.publishedAt};

async function callableResult(route: Route, result: unknown): Promise<void> {
  await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({result})});
}
async function callableDenied(route: Route): Promise<void> {
  await route.fulfill({status: 403, contentType: 'application/json', body: JSON.stringify({error: {status: 'PERMISSION_DENIED', message: 'Not eligible.'}})});
}
async function scheduleFixture(page: Page, entries = [locked, published]): Promise<void> {
  await page.route('**/getPublicPublishingSchedule', route => callableResult(route, {serverNow, entries}));
}

test.beforeEach(async ({page}) => { await suppressMembershipCampaign(page); });

test('anonymous schedule exposes published reading links and keeps scheduled posts locked', async ({page}) => {
  await scheduleFixture(page);
  await page.goto('/schedule');
  await expect(page.getByRole('heading', {name: 'Posting schedule', exact: true})).toBeVisible();
  const next = page.getByTestId('scheduled-post-next-post');
  await expect(next).toContainText('Soon');
  await expect(next.locator('a')).toHaveCount(0);
  await expect(page.getByTestId('scheduled-post-published-post').getByRole('link', {name: 'Read'})).toHaveAttribute('href', '/blog/published-post');
  await expect(page.locator('app-upcoming-holiday-schedule')).toBeVisible();
  await expect(page.locator('audio')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('server-granted member response offers early reading without changing the scheduled status', async ({page}) => {
  await scheduleFixture(page, [{...locked, access: 'early'}]);
  await page.route('**/getScheduledPostForReader', route => callableResult(route, {serverNow, access: 'early', post: earlyPost}));
  await page.goto('/schedule');
  await page.getByRole('link', {name: 'Member early access'}).click();
  await expect(page).toHaveURL(/\/schedule\/read\/next-post$/);
  await expect(page.getByTestId('early-reader-article')).toContainText('PRIVATE_READER_FIXTURE_BODY_7462');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.locator('app-blog-article-library-control, app-blog-article-reaction, app-blog-comments')).toHaveCount(0);
  const persistedText = await page.evaluate(() => JSON.stringify({local: {...localStorage}, session: {...sessionStorage}}));
  expect(persistedText).not.toContain('PRIVATE_READER_FIXTURE_BODY_7462');
});

test('denied direct early-reader routes reveal no private body and allow retry', async ({page}) => {
  await page.route('**/getScheduledPostForReader', callableDenied);
  await page.goto('/schedule/read/next-post');
  await expect(page.getByRole('heading', {name: 'Not ready to read'})).toBeVisible();
  await expect(page.getByTestId('early-reader-article')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Check again'})).toBeVisible();
  await expect(page.getByRole('link', {name: '← Posting schedule'})).toHaveAttribute('href', '/schedule');
});

test('early article is cleared on access revocation and never restored from a saved copy', async ({page}) => {
  let granted = true;
  await page.route('**/getScheduledPostForReader', route => granted
    ? callableResult(route, {serverNow, access: 'early', post: earlyPost}) : callableDenied(route));
  await page.goto('/schedule/read/next-post');
  await expect(page.getByTestId('early-reader-article')).toBeVisible();
  granted = false;
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('not available');
  await expect(page.getByTestId('early-reader-article')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('PRIVATE_READER_FIXTURE_BODY_7462');
});

test('published reader decisions redirect to the canonical public article', async ({page}) => {
  await page.route('**/getScheduledPostForReader', route => callableResult(route, {serverNow, access: 'public', post: {...earlyPost, status: 'published'}}));
  await page.goto('/schedule/read/next-post');
  await expect(page).toHaveURL(/\/blog\/next-post$/);
  await expect(page.getByTestId('early-reader-article')).toHaveCount(0);
});

test('backend failures have a retry state and never fabricate an empty schedule', async ({page}) => {
  let failing = true;
  await page.route('**/getPublicPublishingSchedule', route => failing
    ? route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: {status: 'UNAVAILABLE', message: 'Try later.'}})})
    : callableResult(route, {serverNow, entries: []}));
  await page.goto('/schedule');
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await expect(page.getByText('No announced posts yet.', {exact: false})).toHaveCount(0);
  failing = false;
  await page.getByRole('button', {name: 'Try again'}).click();
  await expect(page.getByText('No announced posts yet.', {exact: false})).toBeVisible();
});

test('advancing the browser clock refreshes access but cannot unlock a server-locked article', async ({page}) => {
  let requests = 0;
  await page.clock.install({time: new Date(serverNow)});
  await page.route('**/getPublicPublishingSchedule', route => { requests++; return callableResult(route, {serverNow, entries: [{...locked, publishedAt: '2000-01-01T00:00:00.000Z'}]}); });
  await page.goto('/schedule');
  await expect(page.getByTestId('scheduled-post-next-post')).toBeVisible();
  await page.clock.fastForward(60_000);
  await expect.poll(() => requests).toBeGreaterThan(1);
  await expect(page.getByTestId('scheduled-post-next-post').locator('a')).toHaveCount(0);
});

test('small phone schedule remains readable without horizontal overflow in dark and light modes', async ({page}) => {
  await scheduleFixture(page);
  await page.setViewportSize({width: 320, height: 740});
  await page.goto('/schedule');
  await expect(page.getByTestId('scheduled-post-next-post')).toBeVisible();
  for (const dark of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const link = page.getByTestId('scheduled-post-published-post').getByRole('link', {name: 'Read'});
    const bounds = await link.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }
});
