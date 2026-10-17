import assert from 'node:assert/strict';
import {cpSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function createPreviewHostingConfig(source, headSha) {
  assert.match(headSha ?? '', /^[a-f0-9]{40}$/, 'Preview head SHA must be a full commit hash');
  assert.ok(source.hosting && !Array.isArray(source.hosting), 'Expected one Hosting configuration');
  const hosting = structuredClone(source.hosting);
  delete hosting.predeploy;
  hosting.public = 'public';
  // Explicit API/feed rewrites still use the deployed backend. App routes must
  // bootstrap this channel's assets, never the live renderSeoHtml shell.
  hosting.rewrites = (hosting.rewrites ?? [])
    .filter(rewrite => !['**', '**/*'].includes(rewrite.source));
  hosting.rewrites.push({source: '**', destination: '/index.html'});
  hosting.headers = [...(hosting.headers ?? []), {
    source: '**',
    headers: [
      {key: 'X-Robots-Tag', value: 'noindex, nofollow'},
      {key: 'X-CM-Preview-Commit', value: headSha},
    ],
  }];
  return {hosting};
}

export function stageFirebasePreview({sourceConfig, buildDirectory, outputDirectory, headSha}) {
  const index = readFileSync(join(buildDirectory, 'index.html'), 'utf8');
  const entries = previewEntryAssets(index);
  assert.ok(entries.some(asset => /(?:^|\/)main-[^/]+\.js$/.test(asset)), 'Missing app entry bundle');
  for (const asset of entries) {
    const path = resolve(buildDirectory, asset.replace(/^\//, ''));
    const local = relative(resolve(buildDirectory), path);
    assert.ok(!local.startsWith('..') && !isAbsolute(local), 'Asset must be inside the build');
    assert.ok(existsSync(path), `Missing preview entry asset: ${asset}`);
  }
  const config = createPreviewHostingConfig(sourceConfig, headSha);
  mkdirSync(outputDirectory, {recursive: true});
  cpSync(buildDirectory, join(outputDirectory, 'public'), {recursive: true});
  const metadata = join(outputDirectory, 'public', '__preview__', 'build.json');
  mkdirSync(dirname(metadata), {recursive: true});
  writeFileSync(metadata, `${JSON.stringify({headSha, appEntryAssets: entries}, null, 2)}\n`);
  writeFileSync(join(outputDirectory, 'firebase.json'), `${JSON.stringify(config, null, 2)}\n`);
  return config;
}

export function previewEntryAssets(html) {
  return [...new Set([...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css))"/g)]
    .map(match => match[1]).filter(asset => !/^(?:https?:)?\/\//.test(asset)))];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , buildDirectory, outputDirectory] = process.argv;
  assert.ok(buildDirectory && outputDirectory, 'Usage: create-firebase-preview-config.mjs <build-directory> <output-directory>');
  stageFirebasePreview({
    sourceConfig: JSON.parse(readFileSync('firebase.json', 'utf8')),
    buildDirectory, outputDirectory, headSha: process.env.PREVIEW_HEAD_SHA,
  });
  console.log('Staged Hosting-only preview with matching SPA shell and entry assets.');
}
