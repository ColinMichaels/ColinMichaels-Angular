import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceConfigPath = path.join(repositoryRoot, 'ngsw-config.json');
const generatedRoot = path.join(repositoryRoot, 'dist', 'colin-michaels-firebase', 'browser');
const generatedManifestPath = path.join(generatedRoot, 'ngsw.json');
const MAX_CRITICAL_CACHE_BYTES = 1.5 * 1024 * 1024;

const sourceConfig = readJson(sourceConfigPath);
const criticalSource = requireGroup(sourceConfig.assetGroups, 'app-shell-critical', sourceConfigPath);
const lazySource = requireGroup(sourceConfig.assetGroups, 'lazy-code-and-fonts', sourceConfigPath);
const criticalIndex = sourceConfig.assetGroups.indexOf(criticalSource);
const lazyIndex = sourceConfig.assetGroups.indexOf(lazySource);

assert.equal(criticalSource.installMode, 'prefetch');
assert.equal(criticalSource.updateMode, 'prefetch');
assert.equal(lazySource.installMode, 'lazy');
assert.equal(lazySource.updateMode, 'lazy');
assert.ok(criticalIndex < lazyIndex, 'The critical group must precede the broad lazy group so first-match routing stays safe.');

const criticalPatterns = criticalSource.resources?.files ?? [];
const lazyPatterns = lazySource.resources?.files ?? [];
assert.ok(criticalPatterns.includes('/main-*.js'), 'The critical group must prefetch the main bundle.');
assert.ok(criticalPatterns.includes('/polyfills-*.js'), 'The critical group must prefetch the polyfills bundle.');
assert.ok(criticalPatterns.includes('/styles-*.css'), 'The critical group must prefetch global styles.');
assert.ok(!criticalPatterns.includes('/*.js'), 'The critical group must not prefetch every JavaScript chunk.');
assert.ok(!criticalPatterns.includes('/assets/fonts/**/*.woff2'), 'The critical group must not prefetch every font.');
assert.ok(lazyPatterns.includes('/*.js'), 'The lazy group must cover non-critical JavaScript chunks.');
assert.ok(lazyPatterns.includes('/assets/fonts/**/*.woff2'), 'The lazy group must cache fonts on demand.');

assert.ok(
  existsSync(generatedManifestPath),
  `Missing ${path.relative(repositoryRoot, generatedManifestPath)}. Run npm run build before this validation.`
);

const generatedManifest = readJson(generatedManifestPath);
const criticalGenerated = requireGroup(generatedManifest.assetGroups, 'app-shell-critical', generatedManifestPath);
const lazyGenerated = requireGroup(generatedManifest.assetGroups, 'lazy-code-and-fonts', generatedManifestPath);
const prefetchedLazyChunks = criticalGenerated.urls.filter(url => /^\/chunk-.*\.js$/.test(url));
const lazyChunks = lazyGenerated.urls.filter(url => /^\/chunk-.*\.js$/.test(url));
const prefetchedBytes = criticalGenerated.urls.reduce((total, url) => {
  const outputPath = path.join(generatedRoot, url.replace(/^\//, ''));
  return existsSync(outputPath) ? total + statSync(outputPath).size : total;
}, 0);

assert.deepEqual(prefetchedLazyChunks, [], 'Generated critical app shell must not contain lazy JavaScript chunks.');
assert.ok(lazyChunks.length > 0, 'Generated lazy cache group must contain route or deferrable-view chunks.');
assert.ok(criticalGenerated.urls.some(url => /^\/main-.*\.js$/.test(url)), 'Generated critical group is missing main.');
assert.ok(criticalGenerated.urls.some(url => /^\/polyfills-.*\.js$/.test(url)), 'Generated critical group is missing polyfills.');
assert.ok(criticalGenerated.urls.some(url => /^\/styles-.*\.css$/.test(url)), 'Generated critical group is missing styles.');
assert.ok(
  prefetchedBytes <= MAX_CRITICAL_CACHE_BYTES,
  `Generated critical app shell is ${formatBytes(prefetchedBytes)}; the production budget is ${formatBytes(MAX_CRITICAL_CACHE_BYTES)}.`
);

console.log(
  `Service-worker cache policy valid: ${criticalGenerated.urls.length} critical files `
  + `(${formatBytes(prefetchedBytes)}) and ${lazyChunks.length} lazy JavaScript chunks cached on demand.`
);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function requireGroup(groups, name, sourcePath) {
  const group = groups?.find(candidate => candidate.name === name);
  assert.ok(group, `Missing ${name} asset group in ${path.relative(repositoryRoot, sourcePath)}.`);
  return group;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}
