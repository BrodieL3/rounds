import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';

const { getRootStackScreens } = require('../lib/navigation-shell');

const ROOT_STACK_SCREENS = getRootStackScreens();

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {ROOT_STACK_SCREENS.map((screen) => (
          <Stack.Screen key={screen.name} name={screen.name} options={screen.options} />
        ))}
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
