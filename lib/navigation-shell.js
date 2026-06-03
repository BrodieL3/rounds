const DEFAULT_AUTHENTICATED_ROUTE = '/(tabs)/friends';
const ADD_ENTRY_ROUTE = '/add';

const PRIMARY_TABS = Object.freeze([
  Object.freeze({
    name: 'friends',
    label: 'Friends',
    title: 'Friends',
    role: 'planning',
    routeHref: '/(tabs)/friends',
    icon: Object.freeze({
      sfDefault: 'bubble.left.and.bubble.right',
      sfSelected: 'bubble.left.and.bubble.right.fill',
      fallbackDefault: 'chatbubbles-outline',
      fallbackSelected: 'chatbubbles',
    }),
  }),
  Object.freeze({
    name: 'feed',
    label: 'Feed',
    title: 'Feed',
    role: 'activity',
    routeHref: '/(tabs)/feed',
    icon: Object.freeze({
      sfDefault: 'newspaper',
      sfSelected: 'newspaper.fill',
      fallbackDefault: 'newspaper-outline',
      fallbackSelected: 'newspaper',
    }),
  }),
  Object.freeze({
    name: 'add-tab-placeholder',
    label: '',
    title: 'Add',
    role: 'create-rating',
    kind: 'add',
    routeHref: '/(tabs)/add-tab-placeholder',
    entryHref: ADD_ENTRY_ROUTE,
    icon: Object.freeze({
      sfDefault: 'plus.circle',
      sfSelected: 'plus.circle.fill',
      fallbackDefault: 'add',
      fallbackSelected: 'add',
    }),
  }),
  Object.freeze({
    name: 'list',
    label: 'List',
    title: 'List',
    role: 'discovery',
    routeHref: '/(tabs)/list',
    icon: Object.freeze({
      sfDefault: 'list.bullet',
      sfSelected: 'list.bullet',
      fallbackDefault: 'list-outline',
      fallbackSelected: 'list',
    }),
  }),
  Object.freeze({
    name: 'profile',
    label: 'Profile',
    title: 'Profile',
    role: 'identity',
    routeHref: '/(tabs)/profile',
    icon: Object.freeze({
      sfDefault: 'person.crop.circle',
      sfSelected: 'person.crop.circle.fill',
      fallbackDefault: 'person-outline',
      fallbackSelected: 'person',
    }),
  }),
]);

const HIDDEN_ROUTE_POLICIES = Object.freeze({
  leaderboard: Object.freeze({
    name: 'leaderboard',
    hidden: true,
    reason: 'deprecated-primary-navigation',
    replacement: '/(tabs)/friends',
  }),
});

const HIDDEN_TAB_ROUTES = Object.freeze(Object.keys(HIDDEN_ROUTE_POLICIES));

function cloneTab(tab) {
  return {
    ...tab,
    icon: tab.icon ? { ...tab.icon } : null,
  };
}

function getPrimaryTabDescriptors() {
  return PRIMARY_TABS.map(cloneTab);
}

function getPrimaryTabNames() {
  return PRIMARY_TABS.map((tab) => tab.name);
}

function getVisibleTabLabels() {
  return PRIMARY_TABS.map((tab) => tab.label);
}

function getTabConfig(name) {
  const tab = PRIMARY_TABS.find((entry) => entry.name === name);
  return tab ? cloneTab(tab) : null;
}

function getNativeTabIcon(name) {
  const tab = PRIMARY_TABS.find((entry) => entry.name === name);
  return tab?.icon ? { ...tab.icon } : null;
}

function getTabIconName(name, focused = false) {
  const icon = getNativeTabIcon(name);
  if (!icon) return null;
  return focused ? icon.fallbackSelected : icon.fallbackDefault;
}

function getAddEntryRoute() {
  return ADD_ENTRY_ROUTE;
}

function getHiddenTabRouteNames() {
  return [...HIDDEN_TAB_ROUTES];
}

function getHiddenRoutePolicy(name) {
  const policy = HIDDEN_ROUTE_POLICIES[name];
  return policy ? { ...policy } : { name, hidden: false, reason: null };
}

function shouldHideTabRoute(name) {
  return Boolean(HIDDEN_ROUTE_POLICIES[name]?.hidden);
}

module.exports = {
  ADD_ENTRY_ROUTE,
  DEFAULT_AUTHENTICATED_ROUTE,
  HIDDEN_ROUTE_POLICIES,
  HIDDEN_TAB_ROUTES,
  PRIMARY_TABS,
  getAddEntryRoute,
  getHiddenRoutePolicy,
  getHiddenTabRouteNames,
  getNativeTabIcon,
  getPrimaryTabDescriptors,
  getPrimaryTabNames,
  getTabConfig,
  getTabIconName,
  getVisibleTabLabels,
  shouldHideTabRoute,
};
module.exports.__esModule = true;
