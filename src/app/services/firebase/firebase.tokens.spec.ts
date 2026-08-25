import {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_DATABASE,
  FIREBASE_FIRESTORE,
  FIREBASE_FUNCTIONS,
  FIREBASE_STORAGE,
  provideFirebaseServices,
} from './firebase.tokens';

describe('provideFirebaseServices', () => {
  it('keeps optional Realtime Database and Storage SDKs out of the eager application providers', () => {
    const providers = provideFirebaseServices({
      apiKey: 'test-api-key',
      appId: 'test-app-id',
      projectId: 'test-project',
    }) as unknown as Array<{ provide?: unknown }>;
    const tokens = providers.map(provider => provider.provide);

    expect(tokens).toContain(FIREBASE_APP);
    expect(tokens).toContain(FIREBASE_AUTH);
    expect(tokens).toContain(FIREBASE_FIRESTORE);
    expect(tokens).toContain(FIREBASE_FUNCTIONS);
    expect(tokens).not.toContain(FIREBASE_DATABASE);
    expect(tokens).not.toContain(FIREBASE_STORAGE);
  });
});
