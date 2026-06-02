const DEFAULT_FIREBASE_EMULATOR_HOST = '127.0.0.1';
const DEFAULT_FIREBASE_EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  storage: 9199,
};

const CONNECTION_STATE_KEY = '__ROUNDS_FIREBASE_EMULATOR_CONFIG__';

function getConnectedConfig() {
  return globalThis[CONNECTION_STATE_KEY] || null;
}

function setConnectedConfig(config) {
  globalThis[CONNECTION_STATE_KEY] = config;
}

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function parsePort(value, fallback) {
  if (value == null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) return fallback;
  return parsed;
}

function getFirebaseEmulatorConfig(env = {}) {
  if (!isEnabled(env.useFirebaseEmulators)) return null;

  const host = String(env.host || DEFAULT_FIREBASE_EMULATOR_HOST).trim() || DEFAULT_FIREBASE_EMULATOR_HOST;
  const ports = {
    auth: parsePort(env.authPort, DEFAULT_FIREBASE_EMULATOR_PORTS.auth),
    firestore: parsePort(env.firestorePort, DEFAULT_FIREBASE_EMULATOR_PORTS.firestore),
    functions: parsePort(env.functionsPort, DEFAULT_FIREBASE_EMULATOR_PORTS.functions),
    storage: parsePort(env.storagePort, DEFAULT_FIREBASE_EMULATOR_PORTS.storage),
  };

  return {
    host,
    ports,
    authUrl: `http://${host}:${ports.auth}`,
  };
}

function connectFirebaseEmulators(services, connectors, env = {}) {
  const config = getFirebaseEmulatorConfig(env);
  if (!config) return null;

  const existingConfig = getConnectedConfig();
  if (existingConfig) return existingConfig;

  connectors.connectAuthEmulator(services.auth, config.authUrl, { disableWarnings: true });
  connectors.connectFirestoreEmulator(services.db, config.host, config.ports.firestore);
  connectors.connectFunctionsEmulator(services.functions, config.host, config.ports.functions);
  connectors.connectStorageEmulator(services.storage, config.host, config.ports.storage);

  setConnectedConfig(config);
  return config;
}

function resetFirebaseEmulatorConnectionForTests() {
  delete globalThis[CONNECTION_STATE_KEY];
}

module.exports = {
  DEFAULT_FIREBASE_EMULATOR_HOST,
  DEFAULT_FIREBASE_EMULATOR_PORTS,
  connectFirebaseEmulators,
  getFirebaseEmulatorConfig,
  resetFirebaseEmulatorConnectionForTests,
};
