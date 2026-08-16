import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const expectedFiles = [
  'src/index.html',
  'dist/colin-michaels-firebase/browser/index.html',
  'functions/seo-index.html',
];

for (const relativePath of expectedFiles) {
  const filePath = resolve(relativePath);
  assert.ok(existsSync(filePath), `${relativePath} does not exist; build and prepare the Functions SEO shell first.`);

  const html = readFileSync(filePath, 'utf8');
  const appRoot = html.match(/<app-root(?:\s[^>]*)?>([\s\S]*?)<\/app-root>/i)?.[1] ?? '';

  assert.match(html, /<title>Cool Gadgets, Useful Tech &amp; Internet Finds \| Colin Michaels<\/title>|<title>Cool Gadgets, Useful Tech & Internet Finds \| Colin Michaels<\/title>/i);
  assert.match(html, /data-homepage-fallback/i);
  assert.ok(appRoot.trim().length > 0, `${relativePath} has an empty app-root.`);
  assert.equal((appRoot.match(/<h1(?:\s[^>]*)?>/gi) ?? []).length, 1, `${relativePath} must have one fallback H1.`);
  assert.match(appRoot, /href="\/blog"/i);
  assert.match(appRoot, /href="\/topics\/gadgets-toys"/i);
  assert.match(appRoot, /href="\/topics\/drones-fpv"/i);
  assert.match(appRoot, /youtube\.com\/channel\/UCKZ3E88t-BoUqPgZygJw6bA/i);
  assert.match(html, /instagram\.com\/colinmichaels\//i);
  assert.doesNotMatch(html, /captaincolinfpv/i);
  assert.match(html, /<noscript><style>#cm-initial-loader\{display:none!important\}<\/style><\/noscript>/i);
}

console.log(`Validated semantic homepage fallback in ${expectedFiles.length} SEO shells.`);
