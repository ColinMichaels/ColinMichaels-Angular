import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewEntryAssets} from '../.github/scripts/create-firebase-preview-config.mjs';

export const previewSmokeRoutes = ['/', '/blog', '/login', '/os/weather-app', '/admin/cms', '/schedule', '/archive/seasons'];

export async function verifyFirebasePreview({url, headSha, fetchImpl = fetch, routes = previewSmokeRoutes}) {
  const origin = new URL(url).origin;
  assert.match(new URL(origin).hostname, /^[a-z0-9-]+--pr-\d+-[a-z0-9]+\.web\.app$/, 'Expected an exact PR preview hostname');
  assert.match(headSha ?? '', /^[a-f0-9]{40}$/, 'Expected a full preview head SHA');
  const get = async path => {
    const response = await fetchImpl(new URL(path, origin), {cache: 'no-store', signal: AbortSignal.timeout(20_000)});
    assert.equal(response.status, 200, `Preview request failed: ${path} (${response.status})`);
    return response;
  };
  const metadata = await (await get('/__preview__/build.json')).json();
  assert.equal(metadata.headSha, headSha, 'Preview source identity is stale');
  assert.ok(metadata.appEntryAssets?.length, 'Preview entry asset manifest is empty');
  const expected = [...metadata.appEntryAssets].sort();
  await Promise.all(routes.map(async path => {
    const response = await get(path);
    assert.equal(response.headers.get('x-cm-preview-commit'), headSha, `Unexpected preview release at ${path}`);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/, `Expected HTML at ${path}`);
    assert.deepEqual(previewEntryAssets(await response.text()).sort(), expected, `Mismatched entry assets at ${path}`);
  }));
  for (const asset of expected) {
    const response = await get(`/${asset.replace(/^\//, '')}`);
    assert.match(response.headers.get('content-type') ?? '', asset.endsWith('.css') ? /text\/css/ : /(?:java|ecma)script/,
      `Invalid asset MIME type: ${asset}`);
    assert.ok((await response.arrayBuffer()).byteLength > 0, `Empty preview asset: ${asset}`);
  }
  return {headSha, routes: routes.length, assets: expected};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await verifyFirebasePreview({url: process.env.PREVIEW_URL, headSha: process.env.PREVIEW_HEAD_SHA});
  console.log(`Verified ${result.routes} preview routes and ${result.assets.length} matching entry assets at ${result.headSha}.`);
}
