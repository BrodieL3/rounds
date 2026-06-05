function loadPlatformOS() {
  try {
    return require('react-native').Platform.OS;
  } catch (_error) {
    return 'unknown';
  }
}

function loadExpoHaptics() {
  try {
    return require('expo-haptics');
  } catch (_error) {
    return null;
  }
}

function createPlatformService({ platformOS = loadPlatformOS(), haptics = loadExpoHaptics() } = {}) {
  const isIOS = platformOS === 'ios';
  const isAndroid = platformOS === 'android';
  const isWeb = platformOS === 'web';

  async function selectionHaptic() {
    if (!isIOS || !haptics?.impactAsync) return false;
    try {
      const style = haptics.ImpactFeedbackStyle?.Light;
      await haptics.impactAsync(style);
      return true;
    } catch (_error) {
      return false;
    }
  }

  return {
    platformOS,
    isIOS,
    isAndroid,
    isWeb,
    selectionHaptic,
  };
}

const platformService = createPlatformService();

module.exports = {
  createPlatformService,
  platformService,
  selectionHaptic: platformService.selectionHaptic,
};
module.exports.__esModule = true;
