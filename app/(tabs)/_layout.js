import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/constants';
import AppIcon from '../../components/ui/AppIcon';
import PlusMorphIcon from '../../components/ui/PlusMorphIcon';
import { selectionHaptic } from '../../lib/platform-service';

const {
  getHiddenTabRouteNames,
  getPrimaryTabDescriptors,
} = require('../../lib/navigation-shell');

const PRIMARY_TABS = getPrimaryTabDescriptors();
const HIDDEN_TAB_ROUTES = getHiddenTabRouteNames();

function getTabIconVisual(tab) {
  const { size = 30, translateY = 0 } = tab.icon?.visual ?? {};
  return {
    width: size,
    height: size,
    lineHeight: size,
    transform: translateY ? [{ translateY }] : undefined,
  };
}

function TabIcon({ focused, tab }) {
  const { size = 30 } = tab.icon?.visual ?? {};
  return (
    <View style={styles.tabIcon}>
      <AppIcon
        name={tab.icon?.semantic}
        focused={focused}
        size={size}
        color={focused ? COLORS.accent : COLORS.textPrimary}
        style={[styles.tabGlyph, getTabIconVisual(tab)]}
      />
    </View>
  );
}

// The Plus tab's +→X morph lives in components/ui/PlusMorphIcon.js (shared with BottomNav).

function renderPrimaryTab(tab) {
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

// The center + is an icon-only tab whose press is intercepted: instead of switching to a
// tab screen it opens the tab's configured route (tab.opens, currently /add) as a modal,
// leaving the current tab active underneath. Target lives in lib/navigation-shell.js.
function renderPlusTab(tab, onPress) {
  return (
    <Tabs.Screen
      key={tab.name}
      name={tab.name}
      listeners={{
        tabPress: (event) => {
          event.preventDefault();
          selectionHaptic();
          onPress();
        },
      }}
      options={{
        title: tab.title,
        tabBarIcon: () => <PlusMorphIcon open={false} />,
        tabBarLabel: tab.label,
      }}
    />
  );
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <View style={styles.shell}>
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: 'shift',
          sceneStyle: styles.scene,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarItemStyle: styles.tabItem,
          tabBarIconStyle: styles.tabIconSlot,
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.textPrimary,
        }}
      >
        {PRIMARY_TABS.map((tab) => (
          tab.kind === 'formSheet'
            ? renderPlusTab(tab, () => router.push(tab.opens))
            : renderPrimaryTab(tab)
        ))}
        {HIDDEN_TAB_ROUTES.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scene: {
    backgroundColor: COLORS.bg,
  },
  tabBar: {
    backgroundColor: COLORS.bg,
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    paddingTop: 12,
    paddingBottom: 18,
    zIndex: 10,
  },
  tabItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconSlot: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabGlyph: {
    alignSelf: 'center',
  },
});
