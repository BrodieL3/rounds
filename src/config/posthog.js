import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

const apiKey = Constants.expoConfig?.extra?.posthogProjectToken;
const host = Constants.expoConfig?.extra?.posthogHost;
const isPostHogConfigured = !!(apiKey && host && apiKey !== 'phc_your_project_token_here');

if (!isPostHogConfigured) {
  console.warn(
    'PostHog project token not configured. Analytics will be disabled. ' +
    'Set POSTHOG_PROJECT_TOKEN and POSTHOG_HOST in your .env file to enable analytics.'
  );
}

export const posthog = new PostHog(apiKey || 'placeholder_key', {
  host,
  disabled: !isPostHogConfigured,
  captureAppLifecycleEvents: true,
  debug: __DEV__,
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  preloadFeatureFlags: true,
  sendFeatureFlagEvent: true,
  featureFlagsRequestTimeoutMs: 10000,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
});

export const isPostHogEnabled = isPostHogConfigured;
