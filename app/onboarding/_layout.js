import { Stack } from 'expo-router';
import { OnboardingProvider } from '../../contexts/OnboardingContext';

const { getOnboardingStackScreens } = require('../../lib/navigation-shell');

const ONBOARDING_STACK_SCREENS = getOnboardingStackScreens();

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {ONBOARDING_STACK_SCREENS.map((screen) => (
          <Stack.Screen key={screen.name} name={screen.name} options={screen.options} />
        ))}
      </Stack>
    </OnboardingProvider>
  );
}
