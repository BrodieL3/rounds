const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const CACHE_KEY = 'rounds_profile_cache';

async function getCachedProfile() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setCachedProfile(profile) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(profile));
  } catch {
    // silent fail
  }
}

async function clearCachedProfile() {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // silent fail
  }
}

module.exports = { getCachedProfile, setCachedProfile, clearCachedProfile };
module.exports.__esModule = true;
