// Single source of Expo config — app.json was folded in here and removed so
// `expo-doctor` sees exactly one config file (it flags app.json + app.config.js
// coexistence). `extra` injects PostHog credentials from the environment at build
// time; process.env is only available in this dynamic config, not in static app.json.
module.exports = {
  expo: {
    name: 'rounds',
    slug: 'rounds',
    scheme: 'rounds',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.eidorbeel.rounds',
    },
    android: {
      package: 'com.eidorbeel.rounds',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-web-browser',
      'expo-font',
      'expo-audio',
      'expo-asset',
      [
        'expo-media-library',
        {
          photosPermission: 'Allow Rounds to access your photos so you can send them in chats.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow Rounds to use the camera to scan a friend’s connect code.',
          recordAudioAndroid: false,
        },
      ],
    ],
    extra: {
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST,
     "eas": {
        "projectId": "4f921114-4dd8-4566-a92d-26b849bd301e"
      }
    },
  },
};
