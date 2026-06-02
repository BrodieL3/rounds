const fs = require('fs');
const path = require('path');
const {
  getFirebaseEmulatorConfig,
  connectFirebaseEmulators,
  resetFirebaseEmulatorConnectionForTests,
} = require('../firebase-emulators');

describe('Firebase emulator client config', () => {
  beforeEach(() => {
    resetFirebaseEmulatorConnectionForTests();
  });

  test('keeps production Firebase clients untouched unless explicitly enabled', () => {
    expect(getFirebaseEmulatorConfig({})).toBe(null);
    expect(getFirebaseEmulatorConfig({ useFirebaseEmulators: '0' })).toBe(null);

    const calls = [];
    const result = connectFirebaseEmulators(
      { auth: 'auth', db: 'db', functions: 'functions', storage: 'storage' },
      {
        connectAuthEmulator: (...args) => calls.push(['auth', ...args]),
        connectFirestoreEmulator: (...args) => calls.push(['firestore', ...args]),
        connectFunctionsEmulator: (...args) => calls.push(['functions', ...args]),
        connectStorageEmulator: (...args) => calls.push(['storage', ...args]),
      },
      { useFirebaseEmulators: 'false' }
    );

    expect(result).toBe(null);
    expect(calls).toEqual([]);
  });

  test('connects every Firebase client to local emulator defaults when enabled', () => {
    const calls = [];
    const services = { auth: 'auth', db: 'db', functions: 'functions', storage: 'storage' };
    const connectors = {
      connectAuthEmulator: (...args) => calls.push(['auth', ...args]),
      connectFirestoreEmulator: (...args) => calls.push(['firestore', ...args]),
      connectFunctionsEmulator: (...args) => calls.push(['functions', ...args]),
      connectStorageEmulator: (...args) => calls.push(['storage', ...args]),
    };

    const result = connectFirebaseEmulators(services, connectors, { useFirebaseEmulators: '1' });

    expect(result).toEqual({
      host: '127.0.0.1',
      authUrl: 'http://127.0.0.1:9099',
      ports: {
        auth: 9099,
        firestore: 8080,
        functions: 5001,
        storage: 9199,
      },
    });
    expect(calls).toEqual([
      ['auth', 'auth', 'http://127.0.0.1:9099', { disableWarnings: true }],
      ['firestore', 'db', '127.0.0.1', 8080],
      ['functions', 'functions', '127.0.0.1', 5001],
      ['storage', 'storage', '127.0.0.1', 9199],
    ]);
  });

  test('supports host and port overrides for device-based manual QA', () => {
    const config = getFirebaseEmulatorConfig({
      useFirebaseEmulators: 'true',
      host: '192.168.1.10',
      authPort: '9100',
      firestorePort: '8081',
      functionsPort: '5100',
      storagePort: '9200',
    });

    expect(config).toEqual({
      host: '192.168.1.10',
      authUrl: 'http://192.168.1.10:9100',
      ports: {
        auth: 9100,
        firestore: 8081,
        functions: 5100,
        storage: 9200,
      },
    });
  });

  test('does not reconnect emulator clients during dev refresh', () => {
    const calls = [];
    const connectors = {
      connectAuthEmulator: (...args) => calls.push(['auth', ...args]),
      connectFirestoreEmulator: (...args) => calls.push(['firestore', ...args]),
      connectFunctionsEmulator: (...args) => calls.push(['functions', ...args]),
      connectStorageEmulator: (...args) => calls.push(['storage', ...args]),
    };

    const first = connectFirebaseEmulators(
      { auth: 'auth1', db: 'db1', functions: 'functions1', storage: 'storage1' },
      connectors,
      { useFirebaseEmulators: '1' }
    );
    const second = connectFirebaseEmulators(
      { auth: 'auth2', db: 'db2', functions: 'functions2', storage: 'storage2' },
      connectors,
      { useFirebaseEmulators: '1' }
    );

    expect(second).toEqual(first);
    expect(calls).toHaveLength(4);
  });

  test('Firebase app initialization exposes Expo public env toggle for manual emulator QA', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'firebase.js'), 'utf8');

    expect(source).toContain('connectFirebaseEmulators');
    expect(source).toContain('connectAuthEmulator');
    expect(source).toContain('connectFirestoreEmulator');
    expect(source).toContain('connectFunctionsEmulator');
    expect(source).toContain('connectStorageEmulator');
    expect(source).toContain('process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS');
    expect(source).toContain('process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST');
    expect(source).toContain('firebaseEmulatorConfig');
  });

  test('firebase.json declares emulator ports that match client defaults', () => {
    const firebaseJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'firebase.json'), 'utf8'));

    expect(firebaseJson.emulators).toMatchObject({
      auth: { port: 9099 },
      firestore: { port: 8080 },
      functions: { port: 5001 },
      storage: { port: 9199 },
      ui: { enabled: true, port: 4000 },
    });
  });
});
