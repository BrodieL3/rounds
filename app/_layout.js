import { Stack, usePathname, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { PostHogProvider } from 'posthog-react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { posthog } from '../src/config/posthog';

const { getRootStackScreens } = require('../lib/navigation-shell');

const ROOT_STACK_SCREENS = getRootStackScreens();

export default function RootLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef(undefined);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  return (
    <PostHogProvider
      client={posthog}
      autocapture={{
        captureScreens: false,
        captureTouches: true,
        propsToCapture: ['testID'],
        maxElementsCaptured: 20,
      }}
    >
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {ROOT_STACK_SCREENS.map((screen) => (
            <Stack.Screen key={screen.name} name={screen.name} options={screen.options} />
          ))}
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </PostHogProvider>
  );
}
