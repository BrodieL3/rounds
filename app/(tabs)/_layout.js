import { Tabs, useRouter } from 'expo-router';
import { View, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/constants';
import AppIcon from '../../components/ui/AppIcon';
import { selectionHaptic } from '../../lib/platform-service';

const {
  getAddEntryRoute,
  getHiddenTabRouteNames,
  getPrimaryTabDescriptors,
} = require('../../lib/navigation-shell');

const PRIMARY_TABS = getPrimaryTabDescriptors();
const HIDDEN_TAB_ROUTES = getHiddenTabRouteNames();
const ADD_ENTRY_ROUTE = getAddEntryRoute();

function TabIcon({ focused, tab }) {
  return (
    <View style={styles.tabIcon}>
      <AppIcon name={tab.icon?.semantic} focused={focused} size={22} color={focused ? COLORS.accent : COLORS.textMuted} />
    </View>
  );
}

function AddTabButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Rate a place"
      hitSlop={8}
      style={styles.addTab}
      onPress={() => {
        selectionHaptic();
        router.push(ADD_ENTRY_ROUTE);
      }}
    >
      <View style={styles.addButton}>
        <AppIcon name="action.add" size={28} color="#ffffff" />
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
          title: tab.title,
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
        title: tab.title,
        tabBarIcon: ({ focused }) => <TabIcon focused={focused} tab={tab} />,
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
        sceneStyle: styles.scene,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
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
  scene: {
    backgroundColor: COLORS.bg,
  },
  tabBar: {
    backgroundColor: COLORS.bg,
    borderTopColor: COLORS.bgCard,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
  },
  tabItem: {
    justifyContent: 'center',
    alignItems: 'center',
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
