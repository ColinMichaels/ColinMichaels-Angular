import assert from 'node:assert/strict';
import test from 'node:test';
import {planPreviewDomain, previewHostname} from './preview-firebase-domain.mjs';

const url = 'https://colinmichaels--pr-123-abc123.web.app';
const key = {webSettings: {allowAllDomains: false, integrationType: 'SCORE', allowedDomains: ['colinmichaels.com', 'colinmichaels.web.app', 'colinmichaels.firebaseapp.com']}};
test('adds one exact preview hostname without altering any existing domain', () => {
  const result = planPreviewDomain(key, url);
  assert.deepEqual(result.after, [...key.webSettings.allowedDomains, 'colinmichaels--pr-123-abc123.web.app']);
  assert.equal(key.webSettings.allowedDomains.length, 3);
  assert.equal(planPreviewDomain({webSettings: {...key.webSettings, allowedDomains: result.after}}, url).changed, false);
});
test('rollback removes only the named preview and preserves later registrations', () => {
  const domains = [...key.webSettings.allowedDomains, 'colinmichaels--pr-123-abc123.web.app', 'colinmichaels--pr-456-def456.web.app'];
  const result = planPreviewDomain({webSettings: {...key.webSettings, allowedDomains: domains}}, url, 'remove');
  assert.deepEqual(result.after, [...key.webSettings.allowedDomains, 'colinmichaels--pr-456-def456.web.app']);
});
test('rejects production, shared-domain wildcards, arbitrary origins and disabled verification', () => {
  for (const target of ['https://colinmichaels.com', 'https://web.app', 'http://colinmichaels--pr-123-abc123.web.app', `${url}/login`, `${url}?x=1`, 'https://other--pr-123-abc.web.app']) {
    assert.throws(() => previewHostname(target));
  }
  assert.throws(() => planPreviewDomain({webSettings: {...key.webSettings, allowAllDomains: true}}, url), /verification must remain enabled/);
});
