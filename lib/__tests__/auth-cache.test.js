const store = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key, value) => { store[key] = value; return Promise.resolve(); }),
    removeItem: jest.fn((key) => { delete store[key]; return Promise.resolve(); }),
    clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); return Promise.resolve(); }),
  },
}));

const { getCachedProfile, setCachedProfile, clearCachedProfile } = require('../auth-cache');

describe('auth-cache', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
  });

  test('getCachedProfile returns null when nothing cached', async () => {
    const result = await getCachedProfile();
    expect(result).toBeNull();
  });

  test('set + get round-trip', async () => {
    await setCachedProfile({ onboardingComplete: true, uid: 'abc' });
    const result = await getCachedProfile();
    expect(result).toEqual({ onboardingComplete: true, uid: 'abc' });
  });

  test('clear removes cached profile', async () => {
    await setCachedProfile({ onboardingComplete: true });
    await clearCachedProfile();
    const result = await getCachedProfile();
    expect(result).toBeNull();
  });
});
