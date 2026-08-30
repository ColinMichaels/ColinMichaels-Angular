import {
  FIREBASE_APP,
  FIREBASE_APP_CHECK,
  FIREBASE_AUTH,
  FIREBASE_DATABASE,
  FIREBASE_FIRESTORE,
  FIREBASE_FUNCTIONS,
  FIREBASE_STORAGE,
  provideFirebaseServices,
} from './firebase.tokens';

describe('provideFirebaseServices', () => {
  it('eagerly provides App Check while keeping Realtime Database and Storage lazy', () => {
    const providers = provideFirebaseServices({
      apiKey: 'test-api-key',
      appId: 'test-app-id',
      projectId: 'test-project',
    }) as unknown as Array<{ provide?: unknown }>;
    const tokens = providers.map(provider => provider.provide);

    expect(tokens).toContain(FIREBASE_APP);
    expect(tokens).toContain(FIREBASE_APP_CHECK);
    expect(tokens).toContain(FIREBASE_AUTH);
    expect(tokens).toContain(FIREBASE_FIRESTORE);
    expect(tokens).toContain(FIREBASE_FUNCTIONS);
    expect(tokens).not.toContain(FIREBASE_DATABASE);
    expect(tokens).not.toContain(FIREBASE_STORAGE);
  });

  it('does not initialize App Check until a reCAPTCHA Enterprise key is configured', () => {
    const providers = provideFirebaseServices({
      apiKey: 'test-api-key',
      appId: 'test-app-id',
      projectId: 'test-project',
    }) as unknown as Array<{
      provide?: unknown;
      useFactory?: (app: unknown) => unknown;
    }>;
    const appCheckProvider = providers.find(provider => provider.provide === FIREBASE_APP_CHECK);

    expect(appCheckProvider?.useFactory?.({})).toBeNull();
  });
});
