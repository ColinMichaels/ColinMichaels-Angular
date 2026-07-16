import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const SOCIAL_CONNECTION_PROVIDERS = ['facebook', 'instagram', 'threads'] as const;

export type SocialConnectionProvider = typeof SOCIAL_CONNECTION_PROVIDERS[number];

export interface EncryptedSocialTokenPayload {
  algorithm: 'aes-256-gcm';
  authTag: string;
  ciphertext: string;
  iv: string;
  version: 1;
}

export function isSocialConnectionProvider(value: unknown): value is SocialConnectionProvider {
  return typeof value === 'string'
    && SOCIAL_CONNECTION_PROVIDERS.includes(value as SocialConnectionProvider);
}

export function createSignedOAuthState(
  signingSecret: string,
  nonce = randomBytes(32).toString('base64url')
): string {
  requireSecret(signingSecret, 'OAuth state signing secret');
  const signature = createHmac('sha256', signingSecret).update(nonce).digest('base64url');
  return `${nonce}.${signature}`;
}

export function verifySignedOAuthState(state: string, signingSecret: string): string | null {
  const separatorIndex = state.lastIndexOf('.');

  if (separatorIndex <= 0 || separatorIndex === state.length - 1 || !signingSecret) {
    return null;
  }

  const nonce = state.slice(0, separatorIndex);
  const suppliedSignature = state.slice(separatorIndex + 1);
  const expectedSignature = createHmac('sha256', signingSecret).update(nonce).digest('base64url');
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return null;
  }

  return nonce;
}

export function createOAuthStateDocumentId(state: string): string {
  return createHash('sha256').update(state).digest('hex');
}

export function encryptSocialTokenPayload(
  payload: unknown,
  encodedEncryptionKey: string,
  provider: SocialConnectionProvider
): EncryptedSocialTokenPayload {
  const key = parseEncryptionKey(encodedEncryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(createTokenAdditionalData(provider));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);

  return {
    algorithm: 'aes-256-gcm',
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    version: 1,
  };
}

export function decryptSocialTokenPayload<T>(
  encryptedPayload: EncryptedSocialTokenPayload,
  encodedEncryptionKey: string,
  provider: SocialConnectionProvider
): T {
  if (encryptedPayload.algorithm !== 'aes-256-gcm' || encryptedPayload.version !== 1) {
    throw new Error('Unsupported social token encryption format.');
  }

  const key = parseEncryptionKey(encodedEncryptionKey);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encryptedPayload.iv, 'base64')
  );
  decipher.setAAD(createTokenAdditionalData(provider));
  decipher.setAuthTag(Buffer.from(encryptedPayload.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext) as T;
}

export function createSocialAuthorizationUrl(options: {
  appId: string;
  facebookConfigId?: string;
  graphApiVersion: string;
  provider: SocialConnectionProvider;
  redirectUri: string;
  state: string;
}): string {
  const appId = requireSecret(options.appId, `${options.provider} app ID`);
  const redirectUri = requireHttpsUrl(options.redirectUri, 'OAuth redirect URI');
  const state = requireSecret(options.state, 'OAuth state');
  let authorizationUrl: URL;
  let scopes: readonly string[];

  switch (options.provider) {
    case 'facebook':
      authorizationUrl = new URL(`https://www.facebook.com/${normalizeGraphVersion(options.graphApiVersion)}/dialog/oauth`);
      scopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
      authorizationUrl.searchParams.set(
        'config_id',
        requireSecret(options.facebookConfigId ?? '', 'Facebook Login for Business configuration ID')
      );
      authorizationUrl.searchParams.set('auth_type', 'rerequest');
      break;
    case 'instagram':
      authorizationUrl = new URL('https://www.instagram.com/oauth/authorize');
      scopes = ['instagram_business_basic', 'instagram_business_content_publish'];
      break;
    case 'threads':
      authorizationUrl = new URL('https://threads.net/oauth/authorize');
      scopes = ['threads_basic', 'threads_content_publish'];
      break;
  }

  authorizationUrl.searchParams.set('client_id', appId);
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', scopes.join(','));
  authorizationUrl.searchParams.set('state', state);

  return authorizationUrl.toString();
}

export function normalizeGraphVersion(value: string): string {
  const trimmedValue = value.trim();
  return /^v\d+\.\d+$/.test(trimmedValue) ? trimmedValue : 'v23.0';
}

function createTokenAdditionalData(provider: SocialConnectionProvider): Buffer {
  return Buffer.from(`colinmichaels-social-token:${provider}:v1`, 'utf8');
}

function parseEncryptionKey(value: string): Buffer {
  const key = Buffer.from(value.trim(), 'base64');

  if (key.length !== 32) {
    throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }

  return key;
}

function requireHttpsUrl(value: string, label: string): string {
  const parsedUrl = new URL(value);

  if (parsedUrl.protocol !== 'https:') {
    throw new Error(`${label} must use HTTPS.`);
  }

  return parsedUrl.toString();
}

function requireSecret(value: string, label: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${label} is not configured.`);
  }

  return trimmedValue;
}
