import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function previewHostname(url) {
  const parsed = new URL(url);
  assert.equal(parsed.protocol, 'https:');
  assert.equal(parsed.port, '');
  assert.ok(!parsed.username && !parsed.password && !parsed.search && !parsed.hash);
  assert.equal(parsed.pathname, '/');
  assert.match(parsed.hostname, /^colinmichaels--pr-\d+-[a-z0-9]+\.web\.app$/, 'Only exact ColinMichaels PR preview hostnames are allowed');
  return parsed.hostname;
}

export function planPreviewDomain(key, url, operation = 'add') {
  const hostname = previewHostname(url);
  assert.ok(['add', 'remove'].includes(operation), 'Expected add or remove');
  assert.equal(key.webSettings?.allowAllDomains ?? false, false, 'Domain verification must remain enabled');
  assert.equal(key.webSettings?.integrationType, 'SCORE', 'Expected the App Check score-based key');
  const before = [...(key.webSettings.allowedDomains ?? [])];
  const after = operation === 'add' ? [...new Set([...before, hostname])] : before.filter(domain => domain !== hostname);
  assert.ok(after.length <= 250, 'reCAPTCHA domain limit reached; retire an expired PR hostname first');
  return {hostname, before, after, changed: JSON.stringify(before) !== JSON.stringify(after)};
}

// Maintainer operation, intentionally outside secret-bearing CI: the current
// Hosting deployer does not have reCAPTCHA key mutation permissions.
export async function updatePreviewDomain({mode, project, siteKey, url, receiptPath}) {
  assert.ok(['plan', 'check', 'add', 'remove'].includes(mode), 'Expected plan, check, add or remove');
  previewHostname(url);
  assert.match(project, /^[a-z][a-z0-9-]+$/);
  assert.match(siteKey, /^[a-zA-Z0-9_-]+$/);
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']}).trim();
  const endpoint = `https://recaptchaenterprise.googleapis.com/v1/projects/${project}/keys/${siteKey}`;
  const headers = {Authorization: `Bearer ${token}`, 'x-goog-user-project': project};
  const read = await fetch(endpoint, {headers, signal: AbortSignal.timeout(20_000)});
  assert.equal(read.status, 200, `Cannot read reCAPTCHA key (${read.status}); check the existing maintainer login and access`);
  const current = await read.json();
  const plan = planPreviewDomain(current, url, mode === 'remove' ? 'remove' : 'add');
  if (mode === 'check') {
    assert.ok(!plan.changed, `Preview hostname is not registered: ${plan.hostname}`);
    return plan;
  }
  if (mode === 'plan' || !plan.changed) return plan;
  assert.ok(receiptPath, 'A receipt path outside committed source is required for updates');
  const receipt = {keyName: current.name, operation: mode, ...plan};
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, {mode: 0o600});
  const response = await fetch(`${endpoint}?updateMask=webSettings.allowedDomains`, {
    method: 'PATCH', headers: {...headers, 'Content-Type': 'application/json'},
    body: JSON.stringify({name: current.name, webSettings: {allowedDomains: plan.after}}),
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(response.status, 200, `Domain update failed (${response.status}); retain the receipt for inspection`);
  const confirmed = await (await fetch(endpoint, {headers, signal: AbortSignal.timeout(20_000)})).json();
  assert.equal(confirmed.webSettings?.allowAllDomains ?? false, false);
  assert.deepEqual(confirmed.webSettings.allowedDomains, plan.after);
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , mode, project, siteKey, url, receiptPath] = process.argv;
  const result = await updatePreviewDomain({mode, project, siteKey, url, receiptPath});
  console.log(JSON.stringify(result, null, 2));
}
