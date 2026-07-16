const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createOAuthStateDocumentId,
  createSignedOAuthState,
  createSocialAuthorizationUrl,
  decryptSocialTokenPayload,
  encryptSocialTokenPayload,
  verifySignedOAuthState,
} = require('../lib/social-connections');

const encryptionKey = Buffer.alloc(32, 7).toString('base64');

test('signed OAuth state rejects tampering and produces opaque document IDs', () => {
  const state = createSignedOAuthState('state-secret', 'fixed-nonce');

  assert.equal(verifySignedOAuthState(state, 'state-secret'), 'fixed-nonce');
  assert.equal(verifySignedOAuthState(`${state}tampered`, 'state-secret'), null);
  assert.match(createOAuthStateDocumentId(state), /^[a-f0-9]{64}$/);
  assert.equal(createOAuthStateDocumentId(state).includes('fixed-nonce'), false);
});

test('provider-bound AES-GCM payloads round trip and cannot be swapped between providers', () => {
  const payload = {accessToken: 'provider-token', expiresIn: 3600};
  const encrypted = encryptSocialTokenPayload(payload, encryptionKey, 'instagram');

  assert.deepEqual(decryptSocialTokenPayload(encrypted, encryptionKey, 'instagram'), payload);
  assert.throws(() => decryptSocialTokenPayload(encrypted, encryptionKey, 'threads'));
  assert.equal(encrypted.ciphertext.includes('provider-token'), false);
});

test('authorization URLs use provider-specific login flows and minimum publishing scopes', () => {
  const sharedOptions = {
    appId: '123456',
    graphApiVersion: 'v23.0',
    redirectUri: 'https://colinmichaels.com/api/social/callback',
    state: 'signed-state',
  };
  const facebook = new URL(createSocialAuthorizationUrl({
    ...sharedOptions,
    provider: 'facebook',
    facebookConfigId: '987654',
  }));
  const instagram = new URL(createSocialAuthorizationUrl({...sharedOptions, provider: 'instagram'}));
  const threads = new URL(createSocialAuthorizationUrl({...sharedOptions, provider: 'threads'}));

  assert.equal(facebook.hostname, 'www.facebook.com');
  assert.match(facebook.searchParams.get('scope'), /pages_manage_posts/);
  assert.equal(facebook.searchParams.get('config_id'), '987654');
  assert.equal(facebook.searchParams.get('auth_type'), 'rerequest');
  assert.equal(instagram.hostname, 'www.instagram.com');
  assert.match(instagram.searchParams.get('scope'), /instagram_business_basic/);
  assert.match(instagram.searchParams.get('scope'), /instagram_business_content_publish/);
  assert.doesNotMatch(instagram.searchParams.get('scope'), /pages_show_list/);
  assert.equal(instagram.searchParams.has('force_reauth'), false);
  assert.equal(threads.hostname, 'threads.net');
  assert.match(threads.searchParams.get('scope'), /threads_content_publish/);
});
