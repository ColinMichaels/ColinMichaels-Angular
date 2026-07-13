import {getAuth} from 'firebase-admin/auth';
import {getFirestore, Timestamp} from 'firebase-admin/firestore';
import {logger} from 'firebase-functions';
import {defineSecret, defineString} from 'firebase-functions/params';
import {HttpsError, onCall, onRequest} from 'firebase-functions/v2/https';

import {SITE_URL} from './seo-site';
import {
  EncryptedSocialTokenPayload,
  SOCIAL_CONNECTION_PROVIDERS,
  SocialConnectionProvider,
  createOAuthStateDocumentId,
  createSignedOAuthState,
  createSocialAuthorizationUrl,
  decryptSocialTokenPayload,
  encryptSocialTokenPayload,
  isSocialConnectionProvider,
  normalizeGraphVersion,
  verifySignedOAuthState,
} from './social-connections';

const FUNCTION_REGION = 'us-east1';
const CMS_ACCESS_ROLES = ['admin', 'cmsAdmin', 'contentEditor'] as const;
const SOCIAL_CONNECTIONS_COLLECTION = 'socialConnections';
const SOCIAL_CONNECTION_SECRETS_COLLECTION = 'socialConnectionSecrets';
const SOCIAL_OAUTH_STATES_COLLECTION = 'socialOAuthStates';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const PROVIDER_REQUEST_TIMEOUT_MS = 15 * 1000;
const SITE_CALLABLE_CORS_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://colinmichaels.com',
  'https://www.colinmichaels.com',
  'https://colinmichaels.firebaseapp.com',
  'https://colinmichaels.web.app',
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

// Facebook Login owns both Page and linked Instagram Graph authorization.
const metaPublishingAppId = defineSecret('META_PUBLISHING_APP_ID');
const metaPublishingAppSecret = defineSecret('META_PUBLISHING_APP_SECRET');
const threadsAppId = defineSecret('THREADS_APP_ID');
const threadsAppSecret = defineSecret('THREADS_APP_SECRET');
const socialOAuthStateSecret = defineSecret('SOCIAL_OAUTH_STATE_SECRET');
const socialTokenEncryptionKey = defineSecret('SOCIAL_TOKEN_ENCRYPTION_KEY');
const socialOAuthBaseUrl = defineString('SOCIAL_OAUTH_BASE_URL', {default: SITE_URL});
const metaGraphApiVersion = defineString('META_GRAPH_API_VERSION', {default: 'v23.0'});

type SocialConnectionStatus = 'connected' | 'disconnected' | 'error' | 'expired' | 'needs-selection';

interface SocialConnectionAccountOption {
  id: string;
  label: string;
  note?: string;
}

interface SocialConnectionMetadata {
  accountId?: string;
  accountLabel?: string;
  availableAccounts?: readonly SocialConnectionAccountOption[];
  connectedAt?: string;
  connectedBy?: string;
  expiresAt?: string | null;
  lastValidatedAt?: string;
  provider: SocialConnectionProvider;
  scopes: readonly string[];
  status: SocialConnectionStatus;
  updatedAt: string;
  username?: string;
}

interface StoredSocialConnectionSecret {
  encryptedPayload: EncryptedSocialTokenPayload;
  provider: SocialConnectionProvider;
  updatedAt: string;
}

interface FacebookPageToken {
  accessToken: string;
  accountId: string;
  accountLabel: string;
  instagramAccountId?: string;
}

interface FacebookTokenPayload {
  expiresAt: string | null;
  pageTokens: readonly FacebookPageToken[];
  selectedAccountId?: string;
  userAccessToken: string;
}

interface InstagramAccountToken {
  accessToken: string;
  accountId: string;
  accountLabel: string;
  pageId: string;
  pageLabel: string;
  username?: string;
}

interface InstagramTokenPayload {
  accountTokens: readonly InstagramAccountToken[];
  expiresAt: string | null;
  selectedAccountId?: string;
  userAccessToken: string;
}

interface MetaUserTokenExchange {
  expiresAt: string | null;
  userAccessToken: string;
  version: string;
}

interface ProviderTokenPayload {
  accessToken: string;
  expiresAt: string | null;
  tokenType: string;
  userId: string;
}

interface OAuthStateDocument {
  expiresAt: string;
  provider: SocialConnectionProvider;
  uid: string;
}

interface CallableAuth {
  token: Record<string, unknown>;
  uid: string;
}

export const listSocialConnections = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    requireCmsAccess(request.auth as CallableAuth | undefined);
    const firestore = getFirestore();
    const snapshots = await firestore.getAll(
      ...SOCIAL_CONNECTION_PROVIDERS.map(provider => firestore.collection(SOCIAL_CONNECTIONS_COLLECTION).doc(provider))
    );
    const now = Date.now();
    const connections = SOCIAL_CONNECTION_PROVIDERS.map((provider, index) => {
      const stored = snapshots[index]?.data();
      return toPublicConnection(provider, stored, now);
    });

    return {
      connections,
      fetchedAt: new Date(now).toISOString(),
      deliveryEnabled: false,
    };
  }
);

export const beginSocialConnection = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [
      metaPublishingAppId,
      threadsAppId,
      socialOAuthStateSecret,
    ],
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const uid = requireCmsAccess(request.auth as CallableAuth | undefined);
    const provider = parseProviderRequest(request.data);
    const state = createSignedOAuthState(socialOAuthStateSecret.value());
    const now = Date.now();
    const expiresAt = new Date(now + OAUTH_STATE_TTL_MS).toISOString();
    const firestore = getFirestore();
    const stateRef = firestore
      .collection(SOCIAL_OAUTH_STATES_COLLECTION)
      .doc(createOAuthStateDocumentId(state));

    await stateRef.set({
      provider,
      uid,
      expiresAt,
      expiresAtTimestamp: Timestamp.fromMillis(now + OAUTH_STATE_TTL_MS),
      createdAt: new Date(now).toISOString(),
    }, {merge: false});

    return {
      provider,
      authorizationUrl: createSocialAuthorizationUrl({
        provider,
        appId: getProviderAppId(provider),
        graphApiVersion: metaGraphApiVersion.value(),
        redirectUri: getOAuthCallbackUri(provider),
        state,
      }),
      expiresAt,
    };
  }
);

export const selectSocialConnectionAccount = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [socialTokenEncryptionKey],
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const uid = requireCmsAccess(request.auth as CallableAuth | undefined);
    const data = requireRecord(request.data, 'Social account selection must be an object.');
    const provider = data['provider'];
    const accountId = getTrimmedString(data['accountId']);

    if ((provider !== 'facebook' && provider !== 'instagram') || !accountId) {
      throw new HttpsError('invalid-argument', 'A valid Meta publishing account selection is required.');
    }

    const firestore = getFirestore();
    const secretRef = firestore.collection(SOCIAL_CONNECTION_SECRETS_COLLECTION).doc(provider);
    const metadataRef = firestore.collection(SOCIAL_CONNECTIONS_COLLECTION).doc(provider);
    const secretSnapshot = await secretRef.get();
    const storedSecret = secretSnapshot.data() as StoredSocialConnectionSecret | undefined;

    if (!storedSecret?.encryptedPayload) {
      throw new HttpsError('failed-precondition', `Reconnect ${provider} before choosing an account.`);
    }

    const now = new Date().toISOString();

    if (provider === 'facebook') {
      let tokenPayload: FacebookTokenPayload;

      try {
        tokenPayload = decryptSocialTokenPayload<FacebookTokenPayload>(
          storedSecret.encryptedPayload,
          socialTokenEncryptionKey.value(),
          provider
        );
      } catch {
        throw new HttpsError('failed-precondition', 'The stored Facebook connection cannot be read. Reconnect it.');
      }

      const selectedPage = tokenPayload.pageTokens.find(page => page.accountId === accountId);

      if (!selectedPage) {
        throw new HttpsError('invalid-argument', 'The selected Facebook Page is not available to this connection.');
      }

      const encryptedPayload = encryptSocialTokenPayload(
        {...tokenPayload, selectedAccountId: selectedPage.accountId},
        socialTokenEncryptionKey.value(),
        provider
      );
      const batch = firestore.batch();
      batch.set(secretRef, {provider, encryptedPayload, updatedAt: now}, {merge: false});
      batch.set(metadataRef, {
        provider,
        status: 'connected',
        accountId: selectedPage.accountId,
        accountLabel: selectedPage.accountLabel,
        availableAccounts: tokenPayload.pageTokens.map(toFacebookAccountOption),
        scopes: facebookScopes,
        expiresAt: tokenPayload.expiresAt,
        connectedAt: now,
        connectedBy: uid,
        lastValidatedAt: now,
        updatedAt: now,
      } satisfies SocialConnectionMetadata, {merge: false});
      await batch.commit();

      return {provider, status: 'connected', accountId: selectedPage.accountId, updatedAt: now};
    }

    let tokenPayload: InstagramTokenPayload;

    try {
      tokenPayload = decryptSocialTokenPayload<InstagramTokenPayload>(
        storedSecret.encryptedPayload,
        socialTokenEncryptionKey.value(),
        provider
      );
    } catch {
      throw new HttpsError('failed-precondition', 'The stored Instagram connection cannot be read. Reconnect it.');
    }

    const selectedAccount = tokenPayload.accountTokens.find(account => account.accountId === accountId);

    if (!selectedAccount) {
      throw new HttpsError('invalid-argument', 'The selected Instagram account is not available to this connection.');
    }

    const encryptedPayload = encryptSocialTokenPayload(
      {...tokenPayload, selectedAccountId: selectedAccount.accountId},
      socialTokenEncryptionKey.value(),
      provider
    );
    const batch = firestore.batch();
    batch.set(secretRef, {provider, encryptedPayload, updatedAt: now}, {merge: false});
    batch.set(metadataRef, {
      provider,
      status: 'connected',
      accountId: selectedAccount.accountId,
      accountLabel: selectedAccount.accountLabel,
      ...(selectedAccount.username ? {username: selectedAccount.username} : {}),
      availableAccounts: tokenPayload.accountTokens.map(toInstagramAccountOption),
      scopes: instagramScopes,
      expiresAt: tokenPayload.expiresAt,
      connectedAt: now,
      connectedBy: uid,
      lastValidatedAt: now,
      updatedAt: now,
    } satisfies SocialConnectionMetadata, {merge: false});
    await batch.commit();

    return {provider, status: 'connected', accountId: selectedAccount.accountId, updatedAt: now};
  }
);

export const disconnectSocialConnection = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const uid = requireCmsAccess(request.auth as CallableAuth | undefined);
    const provider = parseProviderRequest(request.data);
    const firestore = getFirestore();
    const now = new Date().toISOString();
    const batch = firestore.batch();
    batch.delete(firestore.collection(SOCIAL_CONNECTION_SECRETS_COLLECTION).doc(provider));
    batch.set(firestore.collection(SOCIAL_CONNECTIONS_COLLECTION).doc(provider), {
      provider,
      status: 'disconnected',
      scopes: [],
      disconnectedAt: now,
      disconnectedBy: uid,
      updatedAt: now,
    }, {merge: false});
    await batch.commit();

    return {provider, status: 'disconnected', updatedAt: now};
  }
);

export const socialMetaOAuthCallback = onRequest(
  {
    region: FUNCTION_REGION,
    secrets: [
      metaPublishingAppId,
      metaPublishingAppSecret,
      socialOAuthStateSecret,
      socialTokenEncryptionKey,
    ],
    timeoutSeconds: 60,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    await completeOAuthCallback('facebook', request.query, response, exchangeFacebookConnection);
  }
);

export const socialInstagramOAuthCallback = onRequest(
  {
    region: FUNCTION_REGION,
    secrets: [
      metaPublishingAppId,
      metaPublishingAppSecret,
      socialOAuthStateSecret,
      socialTokenEncryptionKey,
    ],
    timeoutSeconds: 60,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    await completeOAuthCallback('instagram', request.query, response, exchangeInstagramConnection);
  }
);

export const socialThreadsOAuthCallback = onRequest(
  {
    region: FUNCTION_REGION,
    secrets: [
      threadsAppId,
      threadsAppSecret,
      socialOAuthStateSecret,
      socialTokenEncryptionKey,
    ],
    timeoutSeconds: 60,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    await completeOAuthCallback('threads', request.query, response, exchangeThreadsConnection);
  }
);

const facebookScopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'] as const;
const instagramScopes = ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'] as const;
const threadsScopes = ['threads_basic', 'threads_content_publish'] as const;

async function completeOAuthCallback(
  provider: SocialConnectionProvider,
  query: Record<string, unknown>,
  response: {redirect(status: number, path: string): void; set(name: string, value: string): unknown},
  exchangeConnection: (code: string, uid: string) => Promise<void>
): Promise<void> {
  response.set('Cache-Control', 'no-store');
  const state = getQueryString(query['state']);

  try {
    const uid = await claimOAuthState(provider, state);
    await requireCurrentCmsAccess(uid);
    const providerError = getQueryString(query['error']);

    if (providerError) {
      throw new Error('Provider authorization was cancelled or denied.');
    }

    const code = getQueryString(query['code']);

    if (!code) {
      throw new Error('The provider did not return an authorization code.');
    }

    await exchangeConnection(code, uid);
    response.redirect(303, createAdminReturnUrl(provider, 'success'));
  } catch (error) {
    logger.error('Unable to complete social provider authorization.', {
      provider,
      error: error instanceof Error ? error.message : 'Unknown OAuth callback error',
    });
    response.redirect(303, createAdminReturnUrl(provider, 'error'));
  }
}

async function claimOAuthState(provider: SocialConnectionProvider, state: string): Promise<string> {
  if (!state || !verifySignedOAuthState(state, socialOAuthStateSecret.value())) {
    throw new Error('OAuth state is missing or invalid.');
  }

  const firestore = getFirestore();
  const stateRef = firestore.collection(SOCIAL_OAUTH_STATES_COLLECTION).doc(createOAuthStateDocumentId(state));

  return await firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(stateRef);
    const data = snapshot.data() as OAuthStateDocument | undefined;

    if (!data || data.provider !== provider || Date.parse(data.expiresAt) <= Date.now()) {
      throw new Error('OAuth state is expired or has already been used.');
    }

    transaction.delete(stateRef);
    return data.uid;
  });
}

async function exchangeFacebookConnection(code: string, uid: string): Promise<void> {
  const {userAccessToken, expiresAt, version} = await exchangeMetaUserAccessToken(code, 'facebook');
  const pageResponse = await fetchProviderJson(`https://graph.facebook.com/${version}/me/accounts?${new URLSearchParams({
    fields: 'id,name,access_token,tasks,instagram_business_account',
    limit: '100',
  })}`, {headers: {Authorization: `Bearer ${userAccessToken}`}});
  const pageTokens = Array.isArray(pageResponse['data'])
    ? pageResponse['data'].flatMap(parseFacebookPageToken)
    : [];

  if (pageTokens.length === 0) {
    throw new Error('No manageable Facebook Pages were returned for this account.');
  }

  const selectedPage = pageTokens.length === 1 ? pageTokens[0] : undefined;
  const now = new Date().toISOString();
  const tokenPayload: FacebookTokenPayload = {
    userAccessToken,
    pageTokens,
    expiresAt,
    ...(selectedPage ? {selectedAccountId: selectedPage.accountId} : {}),
  };
  await storeConnection(
    'facebook',
    uid,
    tokenPayload,
    {
      provider: 'facebook',
      status: selectedPage ? 'connected' : 'needs-selection',
      ...(selectedPage ? {
        accountId: selectedPage.accountId,
        accountLabel: selectedPage.accountLabel,
        connectedAt: now,
      } : {}),
      availableAccounts: pageTokens.map(toFacebookAccountOption),
      scopes: facebookScopes,
      expiresAt,
      connectedBy: uid,
      lastValidatedAt: now,
      updatedAt: now,
    }
  );
}

async function exchangeInstagramConnection(code: string, uid: string): Promise<void> {
  const {userAccessToken, expiresAt, version} = await exchangeMetaUserAccessToken(code, 'instagram');
  const pageResponse = await fetchProviderJson(`https://graph.facebook.com/${version}/me/accounts?${new URLSearchParams({
    fields: 'id,name,access_token,tasks,instagram_business_account',
    limit: '100',
  })}`, {headers: {Authorization: `Bearer ${userAccessToken}`}});
  const pageTokens = Array.isArray(pageResponse['data'])
    ? pageResponse['data'].flatMap(parseFacebookPageToken)
    : [];
  const accountTokens = await Promise.all(pageTokens
    .filter((page): page is FacebookPageToken & { instagramAccountId: string } => Boolean(page.instagramAccountId))
    .map(page => loadInstagramAccountToken(page, version)));

  if (accountTokens.length === 0) {
    throw new Error('No Instagram professional account linked to a manageable Facebook Page was returned.');
  }

  const now = new Date().toISOString();
  const selectedAccount = accountTokens.length === 1 ? accountTokens[0] : undefined;
  await storeConnection(
    'instagram',
    uid,
    {
      userAccessToken,
      accountTokens,
      expiresAt,
      ...(selectedAccount ? {selectedAccountId: selectedAccount.accountId} : {}),
    } satisfies InstagramTokenPayload,
    {
      provider: 'instagram',
      status: selectedAccount ? 'connected' : 'needs-selection',
      ...(selectedAccount ? {
        accountId: selectedAccount.accountId,
        accountLabel: selectedAccount.accountLabel,
        ...(selectedAccount.username ? {username: selectedAccount.username} : {}),
        connectedAt: now,
      } : {}),
      availableAccounts: accountTokens.map(toInstagramAccountOption),
      scopes: instagramScopes,
      expiresAt,
      connectedBy: uid,
      lastValidatedAt: now,
      updatedAt: now,
    }
  );
}

async function exchangeMetaUserAccessToken(
  code: string,
  provider: 'facebook' | 'instagram'
): Promise<MetaUserTokenExchange> {
  const appId = metaPublishingAppId.value();
  const appSecret = metaPublishingAppSecret.value();
  const version = normalizeGraphVersion(metaGraphApiVersion.value());
  const shortTokenResponse = await fetchProviderJson(`https://graph.facebook.com/${version}/oauth/access_token?${new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: getOAuthCallbackUri(provider),
    code,
  })}`);
  const shortAccessToken = requireProviderString(shortTokenResponse, 'access_token', 'Meta access token');
  const longTokenResponse = await fetchProviderJson(`https://graph.facebook.com/${version}/oauth/access_token?${new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortAccessToken,
  })}`);

  return {
    userAccessToken: requireProviderString(longTokenResponse, 'access_token', 'Meta long-lived access token'),
    expiresAt: createExpiryIso(longTokenResponse['expires_in']),
    version,
  };
}

async function loadInstagramAccountToken(
  page: FacebookPageToken & { instagramAccountId: string },
  version: string
): Promise<InstagramAccountToken> {
  const profile = await fetchProviderJson(`https://graph.facebook.com/${version}/${encodeURIComponent(page.instagramAccountId)}?${new URLSearchParams({
    fields: 'id,username,name',
  })}`, {headers: {Authorization: `Bearer ${page.accessToken}`}});
  const accountId = getTrimmedString(profile['id']) || page.instagramAccountId;
  const username = getTrimmedString(profile['username']);
  const accountName = getTrimmedString(profile['name']);

  return {
    accessToken: page.accessToken,
    accountId,
    accountLabel: username ? `@${username}` : accountName || `${page.accountLabel} Instagram`,
    pageId: page.accountId,
    pageLabel: page.accountLabel,
    ...(username ? {username} : {}),
  };
}

async function exchangeThreadsConnection(code: string, uid: string): Promise<void> {
  const shortTokenResponse = await fetchProviderJson(`https://graph.threads.net/oauth/access_token?${new URLSearchParams({
    client_id: threadsAppId.value(),
    client_secret: threadsAppSecret.value(),
    redirect_uri: getOAuthCallbackUri('threads'),
    grant_type: 'authorization_code',
    code,
  })}`, {method: 'POST'});
  const shortAccessToken = requireProviderString(shortTokenResponse, 'access_token', 'Threads access token');
  const longTokenResponse = await fetchProviderJson(`https://graph.threads.net/access_token?${new URLSearchParams({
    grant_type: 'th_exchange_token',
    client_secret: threadsAppSecret.value(),
  })}`, {headers: {Authorization: `Bearer ${shortAccessToken}`}});
  const accessToken = requireProviderString(longTokenResponse, 'access_token', 'Threads long-lived access token');
  const userId = getTrimmedString(shortTokenResponse['user_id']);
  const expiresAt = createExpiryIso(longTokenResponse['expires_in']);
  const profile = await fetchProviderJson(`https://graph.threads.net/v1.0/me?${new URLSearchParams({
    fields: 'id,username,threads_profile_picture_url',
  })}`, {headers: {Authorization: `Bearer ${accessToken}`}});
  const accountId = getTrimmedString(profile['id']) || userId;
  const username = getTrimmedString(profile['username']);

  if (!accountId) {
    throw new Error('Threads did not return an account ID.');
  }

  const now = new Date().toISOString();
  await storeConnection(
    'threads',
    uid,
    {accessToken, expiresAt, tokenType: getTrimmedString(longTokenResponse['token_type']) || 'bearer', userId: accountId} satisfies ProviderTokenPayload,
    {
      provider: 'threads',
      status: 'connected',
      accountId,
      accountLabel: username ? `@${username}` : 'Threads account',
      username,
      scopes: threadsScopes,
      expiresAt,
      connectedAt: now,
      connectedBy: uid,
      lastValidatedAt: now,
      updatedAt: now,
    }
  );
}

async function storeConnection(
  provider: SocialConnectionProvider,
  uid: string,
  tokenPayload: unknown,
  metadata: SocialConnectionMetadata
): Promise<void> {
  const firestore = getFirestore();
  const encryptedPayload = encryptSocialTokenPayload(
    tokenPayload,
    socialTokenEncryptionKey.value(),
    provider
  );
  const batch = firestore.batch();
  batch.set(firestore.collection(SOCIAL_CONNECTION_SECRETS_COLLECTION).doc(provider), {
    provider,
    encryptedPayload,
    updatedAt: metadata.updatedAt,
    updatedBy: uid,
  } satisfies StoredSocialConnectionSecret & {updatedBy: string}, {merge: false});
  batch.set(firestore.collection(SOCIAL_CONNECTIONS_COLLECTION).doc(provider), metadata, {merge: false});
  await batch.commit();
}

async function fetchProviderJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {...init, signal: controller.signal});
    const body = await response.json() as unknown;

    if (!response.ok || !isRecord(body)) {
      throw new Error(`Provider request failed with status ${response.status}.`);
    }

    return body;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Provider request timed out.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function toPublicConnection(
  provider: SocialConnectionProvider,
  stored: Record<string, unknown> | undefined,
  now: number
): SocialConnectionMetadata {
  if (!stored || stored['provider'] !== provider) {
    return {
      provider,
      status: 'disconnected',
      scopes: [],
      updatedAt: new Date(now).toISOString(),
    };
  }

  const expiresAt = getTrimmedString(stored['expiresAt']);
  const storedStatus = parseConnectionStatus(stored['status']);
  const status = storedStatus === 'connected' && expiresAt && Date.parse(expiresAt) <= now
    ? 'expired'
    : storedStatus;
  const availableAccounts = Array.isArray(stored['availableAccounts'])
    ? stored['availableAccounts'].flatMap(parseAccountOption)
    : undefined;

  return {
    provider,
    status,
    scopes: Array.isArray(stored['scopes']) ? stored['scopes'].flatMap(value => typeof value === 'string' ? [value] : []) : [],
    updatedAt: getTrimmedString(stored['updatedAt']) || new Date(now).toISOString(),
    ...(getTrimmedString(stored['accountId']) ? {accountId: getTrimmedString(stored['accountId'])} : {}),
    ...(getTrimmedString(stored['accountLabel']) ? {accountLabel: getTrimmedString(stored['accountLabel'])} : {}),
    ...(getTrimmedString(stored['username']) ? {username: getTrimmedString(stored['username'])} : {}),
    ...(expiresAt ? {expiresAt} : {}),
    ...(getTrimmedString(stored['connectedAt']) ? {connectedAt: getTrimmedString(stored['connectedAt'])} : {}),
    ...(getTrimmedString(stored['lastValidatedAt']) ? {lastValidatedAt: getTrimmedString(stored['lastValidatedAt'])} : {}),
    ...(availableAccounts?.length ? {availableAccounts} : {}),
  };
}

function parseConnectionStatus(value: unknown): SocialConnectionStatus {
  switch (value) {
    case 'connected':
    case 'error':
    case 'expired':
    case 'needs-selection':
      return value;
    default:
      return 'disconnected';
  }
}

function parseFacebookPageToken(value: unknown): readonly FacebookPageToken[] {
  if (!isRecord(value)) {
    return [];
  }

  const accountId = getTrimmedString(value['id']);
  const accountLabel = getTrimmedString(value['name']);
  const accessToken = getTrimmedString(value['access_token']);

  if (!accountId || !accountLabel || !accessToken) {
    return [];
  }

  const instagramAccount = isRecord(value['instagram_business_account'])
    ? getTrimmedString(value['instagram_business_account']['id'])
    : '';

  return [{
    accountId,
    accountLabel,
    accessToken,
    ...(instagramAccount ? {instagramAccountId: instagramAccount} : {}),
  }];
}

function toFacebookAccountOption(page: FacebookPageToken): SocialConnectionAccountOption {
  return {
    id: page.accountId,
    label: page.accountLabel,
    ...(page.instagramAccountId ? {note: 'Linked Instagram professional account detected'} : {}),
  };
}

function toInstagramAccountOption(account: InstagramAccountToken): SocialConnectionAccountOption {
  return {
    id: account.accountId,
    label: account.accountLabel,
    note: `Linked through Facebook Page ${account.pageLabel}`,
  };
}

function parseAccountOption(value: unknown): readonly SocialConnectionAccountOption[] {
  if (!isRecord(value)) {
    return [];
  }

  const id = getTrimmedString(value['id']);
  const label = getTrimmedString(value['label']);

  if (!id || !label) {
    return [];
  }

  const note = getTrimmedString(value['note']);
  return [{id, label, ...(note ? {note} : {})}];
}

function getProviderAppId(provider: SocialConnectionProvider): string {
  switch (provider) {
    case 'facebook':
      return metaPublishingAppId.value();
    case 'instagram':
      return metaPublishingAppId.value();
    case 'threads':
      return threadsAppId.value();
  }
}

function getOAuthCallbackUri(provider: SocialConnectionProvider): string {
  const baseUrl = socialOAuthBaseUrl.value().trim().replace(/\/+$/, '') || SITE_URL;
  const callbackPath = provider === 'facebook' ? 'meta' : provider;
  return `${baseUrl}/api/social/${callbackPath}/callback`;
}

function createAdminReturnUrl(provider: SocialConnectionProvider, result: 'error' | 'success'): string {
  const returnUrl = new URL('/admin/cms/social-connections', socialOAuthBaseUrl.value().trim() || SITE_URL);
  returnUrl.searchParams.set('provider', provider);
  returnUrl.searchParams.set('connection', result);
  return returnUrl.toString();
}

function parseProviderRequest(value: unknown): SocialConnectionProvider {
  const data = requireRecord(value, 'Social connection request must be an object.');
  const provider = data['provider'];

  if (!isSocialConnectionProvider(provider)) {
    throw new HttpsError('invalid-argument', 'Choose a supported social provider.');
  }

  return provider;
}

function requireCmsAccess(auth: CallableAuth | undefined): string {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to manage social connections.');
  }

  if (!CMS_ACCESS_ROLES.some(role => hasRoleClaim(auth.token, role))) {
    throw new HttpsError('permission-denied', 'You must have CMS access to manage social connections.');
  }

  return auth.uid;
}

async function requireCurrentCmsAccess(uid: string): Promise<void> {
  const user = await getAuth().getUser(uid);
  const claims = user.customClaims ?? {};

  if (!CMS_ACCESS_ROLES.some(role => hasRoleClaim(claims, role))) {
    throw new Error('The initiating account no longer has CMS access.');
  }
}

function hasRoleClaim(token: Record<string, unknown>, role: string): boolean {
  if (token[role] === true) {
    return true;
  }

  return isRecord(token['roles']) && token['roles'][role] === true;
}

function requireProviderString(
  record: Record<string, unknown>,
  key: string,
  label: string
): string {
  const value = getTrimmedString(record[key]);

  if (!value) {
    throw new Error(`${label} was not returned.`);
  }

  return value;
}

function createExpiryIso(value: unknown): string | null {
  const expiresInSeconds = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
    ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    : null;
}

function getQueryString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim();
  }

  return '';
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', message);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
