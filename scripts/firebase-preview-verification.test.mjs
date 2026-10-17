import assert from 'node:assert/strict';
import test from 'node:test';
import {verifyFirebasePreview} from './verify-firebase-preview.mjs';

const headSha = 'a'.repeat(40);
const url = 'https://example--pr-123-abc.web.app';
function fixture({staleRoute = '', missingAsset = false, wrongMime = false, staleCommit = false} = {}) {
  return async input => {
    const path = new URL(input).pathname;
    if (path === '/__preview__/build.json') return Response.json({headSha: staleCommit ? 'b'.repeat(40) : headSha, appEntryAssets: ['main-preview.js', 'styles-preview.css']});
    if (path.endsWith('.js') || path.endsWith('.css')) return new Response('body', {status: missingAsset ? 404 : 200,
      headers: {'Content-Type': wrongMime ? 'text/html' : path.endsWith('.css') ? 'text/css' : 'application/javascript'}});
    const main = path === staleRoute ? 'main-production-only.js' : 'main-preview.js';
    return new Response(`<link href="styles-preview.css"><script src="${main}"></script>`, {
      headers: {'Content-Type': 'text/html', 'X-CM-Preview-Commit': headSha},
    });
  };
}

test('accepts a complete preview release across all deep links', async () => {
  const result = await verifyFirebasePreview({url, headSha, fetchImpl: fixture()});
  assert.equal(result.routes, 7);
  assert.deepEqual(result.assets, ['main-preview.js', 'styles-preview.css']);
});
test('rejects a deep link served by the production HTML shell', async () => {
  await assert.rejects(verifyFirebasePreview({url, headSha, fetchImpl: fixture({staleRoute: '/login'})}), /Mismatched entry assets at \/login/);
});
test('rejects missing assets and HTML masquerading as JavaScript', async () => {
  await assert.rejects(verifyFirebasePreview({url, headSha, fetchImpl: fixture({missingAsset: true})}), /Preview request failed/);
  await assert.rejects(verifyFirebasePreview({url, headSha, fetchImpl: fixture({wrongMime: true})}), /Invalid asset MIME type/);
});
test('rejects stale release identity and live production targets', async () => {
  await assert.rejects(verifyFirebasePreview({url, headSha, fetchImpl: fixture({staleCommit: true})}), /identity is stale/);
  await assert.rejects(verifyFirebasePreview({url: 'https://colinmichaels.com', headSha, fetchImpl: fixture()}), /PR preview hostname/);
});
