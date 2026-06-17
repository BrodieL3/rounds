import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { resolveRoute } from '../lib/auth-routing';

// Entry route: resolve where the user belongs from auth + onboarding state.
//   signed-out → /login
//   signed-in & not onboarded → /onboarding
//   signed-in & onboarded → /(tabs)/friends
export default function Index() {
  const { user, loading, isOnboarded } = useAuth();

  useEffect(() => {
    const target = resolveRoute({ loading, user, isOnboarded });
    if (target) {
      router.replace(target);
    }
  }, [user, loading, isOnboarded]);

  return null;
}
