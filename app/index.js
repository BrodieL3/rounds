import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { resolveRoute } from '../lib/auth-routing';
import { COLORS } from '../lib/constants';

export default function Index() {
  const { user, loading, isOnboarded } = useAuth();

  const route = resolveRoute({ loading, user, isOnboarded });

  if (route === null) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return <Redirect href={route} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
});
