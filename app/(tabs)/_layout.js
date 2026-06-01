import { Tabs, useRouter } from 'expo-router';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';

const {
  HIDDEN_TAB_ROUTES,
  PRIMARY_TABS,
  getTabIconName,
} = require('../../lib/tab-config');

function TabIcon({ focused, name }) {
  const iconName = getTabIconName(name, focused);
  return (
    <View style={styles.tabIcon}>
      <Ionicons name={iconName} size={22} color={focused ? COLORS.accent : COLORS.textMuted} />
    </View>
  );
}

function AddTabButton() {
  const router = useRouter();
  return (
    <Pressable style={styles.addTab} onPress={() => router.push('/add')}>
      <View style={styles.addButton}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </View>
    </Pressable>
  );
}

function renderPrimaryTab(tab) {
  if (tab.kind === 'add') {
    return (
      <Tabs.Screen
        key={tab.name}
        name={tab.name}
        options={{
          tabBarButton: () => <AddTabButton />,
          tabBarLabel: tab.label,
        }}
      />
    );
  }

  return (
    <Tabs.Screen
      key={tab.name}
      name={tab.name}
      options={{
        tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={tab.name} />,
        tabBarLabel: tab.label,
      }}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      {PRIMARY_TABS.map(renderPrimaryTab)}
      {HIDDEN_TAB_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bg,
    borderTopColor: COLORS.bgCard,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 8,
  },
  tabItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  addTab: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.hero,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.hero,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
