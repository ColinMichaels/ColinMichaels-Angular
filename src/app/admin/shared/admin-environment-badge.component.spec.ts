import {createFirebaseEnvironmentBadge} from './admin-environment-badge.component';

describe('createFirebaseEnvironmentBadge', () => {
  it('labels fully local emulator mode', () => {
    const badge = createFirebaseEnvironmentBadge({
      firestore: {host: '127.0.0.1', port: 8080},
      functions: {host: '127.0.0.1', port: 5001},
    });

    expect(badge.mode).toBe('emulator');
    expect(badge.label).toBe('Emulator Data');
    expect(badge.detail).toContain('Firestore 127.0.0.1:8080');
    expect(badge.detail).toContain('Functions 127.0.0.1:5001');
  });

  it('labels live Firebase mode', () => {
    const badge = createFirebaseEnvironmentBadge(undefined);

    expect(badge.mode).toBe('live');
    expect(badge.label).toBe('Live Firebase');
  });

  it('labels mixed emulator/live mode', () => {
    const badge = createFirebaseEnvironmentBadge({
      functions: {host: '127.0.0.1', port: 5001},
    });

    expect(badge.mode).toBe('mixed');
    expect(badge.label).toBe('Mixed Firebase');
    expect(badge.detail).toBe('Firestore live / Functions emulator');
  });
});
