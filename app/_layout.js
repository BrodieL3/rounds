import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="venue/[id]/index" options={{ title: 'Venue' }} />
        <Stack.Screen name="venue/[id]/report-crowd" options={{ title: 'Report crowd' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
