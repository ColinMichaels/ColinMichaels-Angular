import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {createPreviewHostingConfig, stageFirebasePreview} from '../.github/scripts/create-firebase-preview-config.mjs';

const headSha = 'a'.repeat(40);
const production = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));

test('preview deep links use their own index while explicit backend routes remain intact', () => {
  const before = structuredClone(production);
  const config = createPreviewHostingConfig(production, headSha);
  assert.deepEqual(production, before, 'Never mutate production configuration');
  assert.deepEqual(Object.keys(config), ['hosting']);
  assert.equal(config.hosting.predeploy, undefined);
  assert.equal(config.hosting.public, 'public');
  assert.deepEqual(config.hosting.rewrites.at(-1), {source: '**', destination: '/index.html'});
  assert.ok(!config.hosting.rewrites.some(rewrite => rewrite.function?.functionId === 'renderSeoHtml'));
  assert.deepEqual(config.hosting.rewrites.slice(0, -1), production.hosting.rewrites.filter(rewrite => rewrite.source !== '**'));
  assert.ok(production.hosting.rewrites.some(rewrite => rewrite.function?.functionId === 'renderSeoHtml'));
  assert.ok(config.hosting.headers.some(rule => rule.headers.some(header => header.key === 'X-Robots-Tag' && header.value === 'noindex, nofollow')));
});

test('rejects missing identity and unsupported Hosting structures', () => {
  assert.throws(() => createPreviewHostingConfig(production, ''), /full commit hash/);
  assert.throws(() => createPreviewHostingConfig({hosting: []}, headSha), /one Hosting/);
});

test('stages a complete matching entry and records its exact source identity', () => {
  const buildDirectory = mkdtempSync(join(tmpdir(), 'preview-build-'));
  const outputDirectory = mkdtempSync(join(tmpdir(), 'preview-output-'));
  try {
    writeFileSync(join(buildDirectory, 'index.html'), '<link href="styles-123.css"><script src="main-123.js"></script>');
    writeFileSync(join(buildDirectory, 'styles-123.css'), 'body{}');
    writeFileSync(join(buildDirectory, 'main-123.js'), 'void 0;');
    stageFirebasePreview({sourceConfig: production, buildDirectory, outputDirectory, headSha});
    const metadata = JSON.parse(readFileSync(join(outputDirectory, 'public', '__preview__', 'build.json')));
    assert.deepEqual(metadata, {headSha, appEntryAssets: ['styles-123.css', 'main-123.js']});
    assert.equal(readFileSync(join(outputDirectory, 'public', 'main-123.js'), 'utf8'), 'void 0;');
  } finally {
    rmSync(buildDirectory, {recursive: true, force: true});
    rmSync(outputDirectory, {recursive: true, force: true});
  }
});

test('rejects the missing hashed entry asset that previously produced blank preview routes', () => {
  const buildDirectory = mkdtempSync(join(tmpdir(), 'preview-missing-'));
  const outputDirectory = mkdtempSync(join(tmpdir(), 'preview-output-'));
  try {
    writeFileSync(join(buildDirectory, 'index.html'), '<script src="main-live-only.js"></script>');
    assert.throws(() => stageFirebasePreview({sourceConfig: production, buildDirectory, outputDirectory, headSha}), /Missing preview entry asset/);
  } finally {
    rmSync(buildDirectory, {recursive: true, force: true});
    rmSync(outputDirectory, {recursive: true, force: true});
  }
});
