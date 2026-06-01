import { Stack } from 'expo-router';
import { OnboardingProvider } from '../../contexts/OnboardingContext';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="phone" />
        <Stack.Screen name="email" />
        <Stack.Screen name="name" />
        <Stack.Screen name="username" />
        <Stack.Screen name="photo" />
        <Stack.Screen name="city" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="spotify" />
      </Stack>
    </OnboardingProvider>
  );
}
